// /Users/digitalflakeadmin/Desktop/vps-uni-solution-api/src/scripts/migrateS3ToVPS.ts
// ============================================
// RATE-LIMITED S3 TO VPS CDN MIGRATION V4
// ============================================
// Features:
// - Smart zip file handling (keeps archives, extracts documents)
// - Respects CDN rate limits (stays at 70% capacity)
// - Adaptive rate limiting based on response times
// - Real-time throughput monitoring
// ============================================

import AWS from "aws-sdk";
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import pLimit from "p-limit";
import unzipper from "unzipper";
import { RateLimiter } from "limiter";
import chalk from "chalk";
import cliProgress from "cli-progress";
import prettyBytes from "pretty-bytes";

dotenv.config();

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

const RATE_LIMITS = {
  // Keep at 70% of actual limits for safety margin
  UPLOAD: {
    PER_SECOND: Math.floor((20000 / 60) * 0.7), // ~233 req/sec (70% of 333)
    PER_MINUTE: Math.floor(20000 * 0.7), // 14,000 req/min
    BURST: 50, // Max concurrent uploads
  },

  DOWNLOAD: {
    PER_SECOND: Math.floor((50000 / 60) * 0.7), // ~583 req/sec
    PER_MINUTE: Math.floor(50000 * 0.7), // 35,000 req/min
    BURST: 100, // Max concurrent downloads
  },

  // Adaptive limits based on load
  ADAPTIVE: {
    MIN_PARALLEL: 5,
    MAX_PARALLEL_UPLOAD: 100, // Never exceed this
    MAX_PARALLEL_DOWNLOAD: 200, // Never exceed this
    LATENCY_THRESHOLD: 2000, // Reduce if latency > 2s
    ERROR_THRESHOLD: 0.05, // Reduce if error rate > 5%
  },
};

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // AWS S3
  aws: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY || "",
    secretAccessKey: process.env.AWS_S3_SECRET_KEY || "",
    region: process.env.AWS_S3_REGION || "",
    bucketName: process.env.AWS_S3_BUCKET_NAME || "",
  },

  // VPS CDN
  vps: {
    baseUrl:
      process.env.FILE_STORAGE_BASE_URL || "https://cdn.digimatrixpro.com",
    publicUrl:
      process.env.FILE_STORAGE_PUBLIC_URL ||
      "https://cdn.digimatrixpro.com/public",
    apiKey:
      process.env.FILE_STORAGE_API_KEY ||
      "fss_970ca7cb162cfe13b4514bb26d4f971b6db19018fd9c3e977f3236946b3fc20c",
    bucketName: process.env.FILE_STORAGE_DEFAULT_BUCKET || "organization-files",
  },

  // Database
  database: {
    host: "162.55.48.116",
    user: "greencloud",
    password: "Chetan@Allied20!",
    database: "file_storage_db",
    port: parseInt(process.env.DB_PORT || "3306"),
  },

  // Migration Settings (Rate Limited)
  migration: {
    tempDir: path.join(__dirname, "../../temp_migration"),
    s3Prefix: "proofs/organization_1/",

    // Dynamic parallel limits (will adjust based on performance)
    parallelDownloads: 50, // Start conservative
    parallelUploads: 25, // Start conservative

    batchSize: 500, // Large batches for efficiency
    chunkSize: 100, // DB query chunk

    // Retry settings
    retryAttempts: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,

    // Monitoring
    metricsInterval: 5000, // Report metrics every 5s
    adaptiveInterval: 10000, // Adjust limits every 10s
  },
};

// ============================================
// TYPES
// ============================================

interface ProcessResult {
  status: "uploaded" | "extracted" | "skipped" | "failed";
  filesCount?: number;
  asArchive?: boolean;
  reason?: string;
}

interface ExtractedFile {
  originalPath: string;
  extractedPath: string;
  fileName: string;
  size: number;
  isNested: boolean;
}

// ============================================
// RATE LIMITERS
// ============================================

class SmartRateLimiter {
  private uploadLimiter: RateLimiter;
  private downloadLimiter: RateLimiter;
  private metrics: {
    uploads: number;
    downloads: number;
    errors: number;
    totalLatency: number;
    requestCount: number;
    startTime: number;
  } = {
    uploads: 0,
    downloads: 0,
    errors: 0,
    totalLatency: 0,
    requestCount: 0,
    startTime: Date.now(),
  };

  constructor() {
    // Token bucket rate limiters
    this.uploadLimiter = new RateLimiter({
      tokensPerInterval: RATE_LIMITS.UPLOAD.PER_SECOND,
      interval: "second",
    });

    this.downloadLimiter = new RateLimiter({
      tokensPerInterval: RATE_LIMITS.DOWNLOAD.PER_SECOND,
      interval: "second",
    });
  }

  resetMetrics() {
    this.metrics = {
      uploads: 0,
      downloads: 0,
      errors: 0,
      totalLatency: 0,
      requestCount: 0,
      startTime: Date.now(),
    };
  }

  async waitForUploadToken(): Promise<void> {
    await this.uploadLimiter.removeTokens(1);
    this.metrics.uploads++;
  }

  async waitForDownloadToken(): Promise<void> {
    await this.downloadLimiter.removeTokens(1);
    this.metrics.downloads++;
  }

  recordLatency(ms: number) {
    this.metrics.totalLatency += ms;
    this.metrics.requestCount++;
  }

  recordError() {
    this.metrics.errors++;
  }

  getMetrics() {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const avgLatency =
      this.metrics.requestCount > 0
        ? this.metrics.totalLatency / this.metrics.requestCount
        : 0;

    return {
      uploadsPerSec: this.metrics.uploads / elapsed,
      downloadsPerSec: this.metrics.downloads / elapsed,
      errorRate:
        this.metrics.errors / (this.metrics.uploads + this.metrics.downloads),
      avgLatency,
      totalRequests: this.metrics.uploads + this.metrics.downloads,
    };
  }
}

const rateLimiter = new SmartRateLimiter();

// ============================================
// ADAPTIVE CONCURRENCY MANAGER
// ============================================

class AdaptiveConcurrencyManager {
  private currentUploadLimit: number;
  private currentDownloadLimit: number;
  private performanceHistory: Array<{
    timestamp: number;
    errorRate: number;
    avgLatency: number;
    throughput: number;
  }> = [];

  constructor() {
    this.currentUploadLimit = CONFIG.migration.parallelUploads;
    this.currentDownloadLimit = CONFIG.migration.parallelDownloads;
  }

  adjustLimits(metrics: any) {
    const { errorRate, avgLatency, uploadsPerSec, downloadsPerSec } = metrics;

    // Record performance
    this.performanceHistory.push({
      timestamp: Date.now(),
      errorRate,
      avgLatency,
      throughput: uploadsPerSec + downloadsPerSec,
    });

    // Keep last 10 samples
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }

    // Adjust based on performance
    if (
      errorRate > RATE_LIMITS.ADAPTIVE.ERROR_THRESHOLD ||
      avgLatency > RATE_LIMITS.ADAPTIVE.LATENCY_THRESHOLD
    ) {
      // Reduce limits
      this.currentUploadLimit = Math.max(
        RATE_LIMITS.ADAPTIVE.MIN_PARALLEL,
        Math.floor(this.currentUploadLimit * 0.8),
      );
      this.currentDownloadLimit = Math.max(
        RATE_LIMITS.ADAPTIVE.MIN_PARALLEL * 2,
        Math.floor(this.currentDownloadLimit * 0.8),
      );

      console.log(
        chalk.yellow(
          `\n⚠️  Reducing concurrency: UL=${this.currentUploadLimit}, DL=${this.currentDownloadLimit}`,
        ),
      );
    } else if (errorRate < 0.01 && avgLatency < 1000) {
      // Increase limits if performing well
      this.currentUploadLimit = Math.min(
        RATE_LIMITS.ADAPTIVE.MAX_PARALLEL_UPLOAD,
        Math.floor(this.currentUploadLimit * 1.2),
      );
      this.currentDownloadLimit = Math.min(
        RATE_LIMITS.ADAPTIVE.MAX_PARALLEL_DOWNLOAD,
        Math.floor(this.currentDownloadLimit * 1.2),
      );

      console.log(
        chalk.green(
          `\n⬆️  Increasing concurrency: UL=${this.currentUploadLimit}, DL=${this.currentDownloadLimit}`,
        ),
      );
    }
  }

  getUploadLimit(): number {
    return this.currentUploadLimit;
  }

  getDownloadLimit(): number {
    return this.currentDownloadLimit;
  }
}

const concurrencyManager = new AdaptiveConcurrencyManager();

// ============================================
// SMART ZIP FILE HANDLING
// ============================================

/**
 * Determines whether a zip file should be extracted or kept as archive
 */
async function shouldExtractZip(
  s3Key: string,
  fileName: string,
): Promise<boolean> {
  const mapping = translatePath(s3Key);

  // Log decision process
  console.log(chalk.cyan(`\n   🤔 Analyzing zip: ${fileName}`));
  console.log(chalk.gray(`      Folder: ${mapping.s3Folder}`));

  // Rule 1: Files in 'zipped' folder should NOT be extracted
  if (mapping.s3Folder === "zipped") {
    console.log(chalk.yellow(`      ⏭️  Keep as archive (in 'zipped' folder)`));
    return false;
  }

  // Rule 2: Batch archives should stay zipped
  const archivePatterns = [
    "all_files",
    "archive",
    "backup",
    "batch",
    "collection",
    "combined",
    "_full_",
    "_complete_",
  ];

  const lowerFileName = fileName.toLowerCase();
  if (archivePatterns.some((pattern) => lowerFileName.includes(pattern))) {
    console.log(chalk.yellow(`      ⏭️  Keep as archive (batch/archive file)`));
    return false;
  }

  // Rule 3: Trade confirmation bundles (pattern matching)
  // These might contain multiple related documents that should be extracted
  if (mapping.s3Folder === "emails" || mapping.s3Folder === "pdfs") {
    const shouldExtract =
      !lowerFileName.includes("_all_") && !lowerFileName.includes("_combined_");

    if (shouldExtract) {
      console.log(
        chalk.blue(
          `      📦 Will extract (document bundle from ${mapping.s3Folder})`,
        ),
      );
    } else {
      console.log(
        chalk.yellow(`      ⏭️  Keep as archive (combined document)`),
      );
    }

    return shouldExtract;
  }

  // Rule 4: Sample files - usually single PDFs, don't extract
  if (mapping.s3Folder === "sample_email_pdfs") {
    console.log(chalk.yellow(`      ⏭️  Keep as archive (sample file)`));
    return false;
  }

  // Default: don't extract unknown zips
  console.log(chalk.yellow(`      ⏭️  Keep as archive (default behavior)`));
  return false;
}

/**
 * Extracts a zip file and returns list of extracted files
 */
async function extractZipFile(zipPath: string): Promise<ExtractedFile[]> {
  const extractedFiles: ExtractedFile[] = [];
  const extractDir = path.join(
    CONFIG.migration.tempDir,
    "extracted_" + Date.now(),
  );

  ensureDir(extractDir);

  console.log(chalk.blue(`      📂 Extracting to temp directory...`));

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on("close", () => resolve())
        .on("error", (err) => reject(err));
    });

    // Recursively find all files (including in nested zips)
    async function scanDirectory(
      dir: string,
      basePath: string = "",
    ): Promise<void> {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(fullPath, relativePath);
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);

          // Check if it's another zip file (nested)
          if (entry.name.endsWith(".zip")) {
            // Check if nested zip should be extracted
            const shouldExtractNested = await shouldExtractZip(
              relativePath,
              entry.name,
            );

            if (shouldExtractNested) {
              console.log(
                chalk.magenta(
                  `         Found nested zip: ${entry.name} (will extract)`,
                ),
              );
              const nestedFiles = await extractZipFile(fullPath);
              extractedFiles.push(...nestedFiles);
            } else {
              // Keep nested zip as file
              extractedFiles.push({
                originalPath: relativePath,
                extractedPath: fullPath,
                fileName: entry.name,
                size: stat.size,
                isNested: true,
              });
            }
          } else {
            extractedFiles.push({
              originalPath: relativePath,
              extractedPath: fullPath,
              fileName: entry.name,
              size: stat.size,
              isNested: basePath.includes("/"),
            });
          }
        }
      }
    }

    await scanDirectory(extractDir);

    console.log(
      chalk.green(`      ✅ Extracted ${extractedFiles.length} files`),
    );

    // Clean up empty extract directory after delay
    setTimeout(() => {
      try {
        fs.rmSync(extractDir, { recursive: true, force: true });
      } catch {}
    }, 60000); // Clean after 1 minute
  } catch (error: any) {
    console.log(chalk.red(`      ❌ Extraction failed: ${error.message}`));
    // Clean up on error
    try {
      fs.rmSync(extractDir, { recursive: true, force: true });
    } catch {}
    throw error;
  }

  return extractedFiles;
}

// ============================================
// S3 OPERATIONS WITH RATE LIMITING
// ============================================

const s3 = new AWS.S3({
  accessKeyId: CONFIG.aws.accessKeyId,
  secretAccessKey: CONFIG.aws.secretAccessKey,
  region: CONFIG.aws.region,
  httpOptions: {
    timeout: 30000,
    connectTimeout: 5000,
  },
});

async function downloadFromS3WithRateLimit(
  s3Key: string,
  localPath: string,
): Promise<{ success: boolean; duration: number }> {
  const startTime = Date.now();

  await rateLimiter.waitForDownloadToken();

  try {
    ensureDir(path.dirname(localPath));

    const s3Stream = s3
      .getObject({
        Bucket: CONFIG.aws.bucketName,
        Key: s3Key,
      })
      .createReadStream();

    const fileStream = fs.createWriteStream(localPath);

    await new Promise<void>((resolve, reject) => {
      s3Stream.pipe(fileStream);
      fileStream.on("finish", () => resolve());
      fileStream.on("error", (err) => reject(err));
      s3Stream.on("error", (err) => reject(err));
    });

    const duration = Date.now() - startTime;
    rateLimiter.recordLatency(duration);

    return { success: true, duration };
  } catch (error) {
    rateLimiter.recordError();
    throw error;
  }
}

// ============================================
// VPS OPERATIONS WITH RATE LIMITING
// ============================================

const vpsClient: AxiosInstance = axios.create({
  baseURL: CONFIG.vps.baseUrl,
  headers: { "X-API-Key": CONFIG.vps.apiKey },
  timeout: 30000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Add response time interceptor
vpsClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config as any).startTime;
    rateLimiter.recordLatency(duration);
    return response;
  },
  (error) => {
    rateLimiter.recordError();
    return Promise.reject(error);
  },
);

vpsClient.interceptors.request.use((config) => {
  (config as any).startTime = Date.now();
  return config;
});

async function uploadToVPSWithRateLimit(
  localPath: string,
  vpsFolder: string,
  fileName: string,
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  await rateLimiter.waitForUploadToken();

  for (let attempt = 1; attempt <= CONFIG.migration.retryAttempts; attempt++) {
    try {
      const formData = new FormData();

      // Handle extracted files from zip
      if (localPath.includes("extracted_")) {
        // This is an extracted file, maintain its structure
        const relativePath = localPath
          .split("extracted_")[1]
          .split("/")
          .slice(1)
          .join("/");
        const targetFolder =
          path.dirname(relativePath) !== "."
            ? path.join(vpsFolder, path.dirname(relativePath))
            : vpsFolder;

        formData.append("file", fs.createReadStream(localPath), fileName);
        formData.append("folder", targetFolder);
      } else {
        formData.append("file", fs.createReadStream(localPath), fileName);
        formData.append("folder", vpsFolder);
      }

      formData.append("isPublic", "true");
      formData.append("overwriteDeleted", "true");
      formData.append("preserveFileName", "true"); // Add this to keep original name

      const response = await vpsClient.post(
        `/api/v1/files/upload/${CONFIG.vps.bucketName}`,
        formData,
        { headers: { ...formData.getHeaders() } },
      );

      return {
        success: true,
        publicUrl: response.data.data.file.publicUrl,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;

      if (attempt < CONFIG.migration.retryAttempts) {
        const delay =
          CONFIG.migration.retryDelay *
          Math.pow(CONFIG.migration.backoffMultiplier, attempt - 1);
        await sleep(delay);
      } else {
        return { success: false, error: errMsg };
      }
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// ============================================
// BATCH PROCESSOR WITH MONITORING
// ============================================

class BatchProcessor {
  private progressBar: cliProgress.SingleBar;
  private stats = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    extracted: 0,
    keptAsArchive: 0,
    totalBytes: 0,
    startTime: Date.now(),
  };

  constructor(total: number) {
    this.progressBar = new cliProgress.SingleBar(
      {
        format:
          " {bar} | {percentage}% | {value}/{total} Files | Speed: {speed} | ETA: {eta_formatted}",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic,
    );

    this.progressBar.start(total, 0, {
      speed: "N/A",
    });
  }

  async processBatch(
    s3Objects: any[],
    existingFiles: Set<string>,
  ): Promise<void> {
    // Dynamic limiters based on current concurrency limits
    const downloadLimit = pLimit(concurrencyManager.getDownloadLimit());
    const uploadLimit = pLimit(concurrencyManager.getUploadLimit());

    const promises = s3Objects.map((s3Obj) =>
      downloadLimit(async () => {
        const fileName = path.basename(s3Obj.Key);
        const localPath = path.join(CONFIG.migration.tempDir, fileName);

        try {
          // Skip existing
          if (existingFiles.has(fileName)) {
            this.stats.skipped++;
            this.updateProgress();
            return;
          }

          // Download from S3
          const downloadResult = await downloadFromS3WithRateLimit(
            s3Obj.Key,
            localPath,
          );

          if (!downloadResult.success) {
            throw new Error("Download failed");
          }

          // Check if it's a zip file
          if (fileName.endsWith(".zip")) {
            const shouldExtract = await shouldExtractZip(s3Obj.Key, fileName);

            if (shouldExtract) {
              // Extract and upload individual files
              const extractedFiles = await extractZipFile(localPath);
              this.stats.extracted += extractedFiles.length;

              // Upload extracted files
              const uploadPromises = extractedFiles.map((extractedFile) =>
                uploadLimit(async () => {
                  const mapping = translatePath(extractedFile.originalPath);
                  const uploadResult = await uploadToVPSWithRateLimit(
                    extractedFile.extractedPath,
                    mapping.vpsFolder,
                    extractedFile.fileName,
                  );

                  if (uploadResult.success) {
                    this.stats.successful++;
                    this.stats.totalBytes += extractedFile.size;
                  } else {
                    this.stats.failed++;
                  }

                  // Clean up extracted file
                  safeDelete(extractedFile.extractedPath);
                }),
              );

              await Promise.all(uploadPromises);
            } else {
              // Upload zip as-is (archive)
              this.stats.keptAsArchive++;

              await uploadLimit(async () => {
                const mapping = translatePath(s3Obj.Key);
                const uploadResult = await uploadToVPSWithRateLimit(
                  localPath,
                  mapping.vpsFolder,
                  fileName,
                );

                if (uploadResult.success) {
                  this.stats.successful++;
                  this.stats.totalBytes += s3Obj.Size;
                } else {
                  this.stats.failed++;
                }
              });
            }
          } else {
            // Regular file upload
            await uploadLimit(async () => {
              const mapping = translatePath(s3Obj.Key);
              const uploadResult = await uploadToVPSWithRateLimit(
                localPath,
                mapping.vpsFolder,
                fileName,
              );

              if (uploadResult.success) {
                this.stats.successful++;
                this.stats.totalBytes += s3Obj.Size;
              } else {
                this.stats.failed++;
              }
            });
          }
        } catch (error: any) {
          this.stats.failed++;
          console.log(
            chalk.red(`\n   ❌ Error processing ${fileName}: ${error.message}`),
          );
        } finally {
          safeDelete(localPath);
          this.stats.processed++;
          this.updateProgress();
        }
      }),
    );

    await Promise.all(promises);
  }

  private updateProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const speed = `${(this.stats.processed / elapsed).toFixed(1)} files/s`;

    this.progressBar.update(this.stats.processed, { speed });
  }

  finish() {
    this.progressBar.stop();

    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const throughput = this.stats.totalBytes / elapsed;

    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           BATCH PROCESSING COMPLETE                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Processed:       ${this.stats.processed.toString().padEnd(57)}║
║  ✅ Successful:   ${this.stats.successful.toString().padEnd(57)}║
║  📦 Extracted:    ${this.stats.extracted.toString().padEnd(57)}║
║  🗄️  Archives:     ${this.stats.keptAsArchive.toString().padEnd(57)}║
║  ⏭️  Skipped:      ${this.stats.skipped.toString().padEnd(57)}║
║  ❌ Failed:       ${this.stats.failed.toString().padEnd(57)}║
║  📊 Throughput:   ${prettyBytes(throughput)}/s${" ".repeat(57 - prettyBytes(throughput).length - 2)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
  }

  getStats() {
    return this.stats;
  }
}

// ============================================
// MONITORING & METRICS
// ============================================

class MetricsMonitor {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    this.intervalId = setInterval(() => {
      const metrics = rateLimiter.getMetrics();

      console.log(
        chalk.cyan(`
📊 METRICS UPDATE (${new Date().toLocaleTimeString()})
────────────────────────────────────────────
  Upload Rate:     ${metrics.uploadsPerSec.toFixed(1)}/s (Limit: ${RATE_LIMITS.UPLOAD.PER_SECOND}/s)
  Download Rate:   ${metrics.downloadsPerSec.toFixed(1)}/s (Limit: ${RATE_LIMITS.DOWNLOAD.PER_SECOND}/s)
  Error Rate:      ${(metrics.errorRate * 100).toFixed(2)}%
  Avg Latency:     ${metrics.avgLatency.toFixed(0)}ms
  Total Requests:  ${metrics.totalRequests}
────────────────────────────────────────────
`),
      );

      // Adjust concurrency based on metrics
      concurrencyManager.adjustLimits(metrics);

      // Reset metrics for next interval
      rateLimiter.resetMetrics();
    }, CONFIG.migration.metricsInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

let dbConnection: mysql.Connection | null = null;

async function getDatabase(): Promise<mysql.Connection> {
  if (!dbConnection) {
    dbConnection = await mysql.createConnection(CONFIG.database);
  }
  return dbConnection;
}

async function checkExistingFiles(fileNames: string[]): Promise<Set<string>> {
  const existing = new Set<string>();

  try {
    const db = await getDatabase();

    console.log(
      chalk.gray(`   Checking ${fileNames.length} files in database...`),
    );

    for (let i = 0; i < fileNames.length; i += CONFIG.migration.chunkSize) {
      const chunk = fileNames.slice(i, i + CONFIG.migration.chunkSize);
      const placeholders = chunk.map(() => "?").join(",");

      // Using correct column names from schema: original_name, stored_name
      const query = `
        SELECT original_name, stored_name 
        FROM files 
        WHERE (original_name IN (${placeholders}) OR stored_name IN (${placeholders}))
        AND status = 'active'
      `;

      const [rows] = await db.execute(query, [...chunk, ...chunk]);

      (rows as any[]).forEach((row) => {
        if (row.original_name) existing.add(row.original_name);
        if (row.stored_name) existing.add(row.stored_name);
      });

      // Show progress for large checks
      if (i > 0 && i % 1000 === 0) {
        console.log(chalk.gray(`   Checked ${i}/${fileNames.length} files...`));
      }
    }

    return existing;
  } catch (error: any) {
    console.log(chalk.yellow(`   ⚠️ Database check failed: ${error.message}`));
    console.log(chalk.yellow(`   Continuing without duplicate check...`));
    return existing;
  }
}
// ============================================
// UTILITIES
// ============================================

function translatePath(s3Key: string) {
  const fileName = path.basename(s3Key);
  let s3Folder = "unknown";

  if (s3Key.includes("/emails/")) s3Folder = "emails";
  else if (s3Key.includes("/pdfs/")) s3Folder = "pdfs";
  else if (s3Key.includes("/sample_email_pdfs/"))
    s3Folder = "sample_email_pdfs";
  else if (s3Key.includes("/zipped/")) s3Folder = "zipped";

  // const vpsFolder = `organization_1/${s3Folder}`;
  const vpsFolder = `proofs/organization_1/${s3Folder}`;
  return { s3Key, s3Folder, vpsFolder, fileName };
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeDelete(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listS3Objects(prefix: string): Promise<any[]> {
  const allObjects: any[] = [];
  let continuationToken: string | undefined;

  console.log(chalk.gray(`   Scanning S3 bucket...`));

  do {
    const response = await s3
      .listObjectsV2({
        Bucket: CONFIG.aws.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
      .promise();

    if (response.Contents) {
      allObjects.push(
        ...response.Contents.filter(
          (obj) =>
            obj.Key && !obj.Key.endsWith("/") && obj.Size && obj.Size > 0,
        ),
      );
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return allObjects;
}

// ============================================
// S3 COST CALCULATOR
// ============================================

function calculateS3Costs(totalFiles: number, totalSizeGB: number): string {
  const costs = {
    dataTransfer: Math.max(0, (totalSizeGB - 0.001) * 0.09), // 1GB free
    getRequests: (totalFiles * 0.0004) / 1000,
    listRequests: (Math.ceil(totalFiles / 1000) * 0.005) / 1000,
  };

  const total = costs.dataTransfer + costs.getRequests + costs.listRequests;

  return chalk.gray(`
   💰 Estimated S3 Costs:
      Data Transfer: $${costs.dataTransfer.toFixed(4)}
      API Requests:  $${(costs.getRequests + costs.listRequests).toFixed(4)}
      Total:         $${total.toFixed(4)} USD
  `);
}

// ============================================
// MAIN MIGRATION
// ============================================

async function migrateWithRateLimits(options: {
  limit?: number;
  folder?: string;
}): Promise<void> {
  const monitor = new MetricsMonitor();

  console.log(
    chalk.bold.green(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                 SMART S3 → VPS MIGRATION V4                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RATE LIMITS:                                                                ║
║    Upload:    ${RATE_LIMITS.UPLOAD.PER_SECOND}/s (${RATE_LIMITS.UPLOAD.PER_MINUTE}/min)${" ".repeat(43)}║
║    Download:  ${RATE_LIMITS.DOWNLOAD.PER_SECOND}/s (${RATE_LIMITS.DOWNLOAD.PER_MINUTE}/min)${" ".repeat(42)}║
║                                                                              ║
║  SMART FEATURES:                                                            ║
║    ✓ Intelligent zip handling (keeps archives, extracts documents)         ║
║    ✓ Preserves 'zipped' folder archives                                    ║
║    ✓ Adaptive concurrency based on performance                             ║
║    ✓ Real-time monitoring & metrics                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
`),
  );

  try {
    // Setup
    await getDatabase();
    ensureDir(CONFIG.migration.tempDir);

    // List S3 objects
    console.log(chalk.bold("\n📂 STEP 1: Listing S3 objects..."));
    let prefix = CONFIG.migration.s3Prefix;
    if (options.folder) {
      prefix = `${CONFIG.migration.s3Prefix}${options.folder}/`;
    }

    let s3Objects = await listS3Objects(prefix);
    console.log(chalk.green(`   ✅ Found ${s3Objects.length} files`));

    // Calculate costs
    const totalSizeGB =
      s3Objects.reduce((sum, obj) => sum + (obj.Size || 0), 0) /
      (1024 * 1024 * 1024);
    console.log(calculateS3Costs(s3Objects.length, totalSizeGB));

    if (options.limit) {
      s3Objects = s3Objects.slice(0, options.limit);
      console.log(chalk.yellow(`\n   📋 Limited to ${options.limit} files`));
    }

    if (s3Objects.length === 0) {
      console.log(chalk.yellow("\n✅ No files to migrate!"));
      return;
    }

    // Check existing files
    console.log(chalk.bold("\n📊 STEP 2: Checking existing files..."));
    const fileNames = s3Objects.map((obj) => path.basename(obj.Key!));
    const existingFiles = await checkExistingFiles(fileNames);
    console.log(
      chalk.green(
        `   ✅ Found ${existingFiles.size} existing files (will skip)\n`,
      ),
    );

    // Start monitoring
    console.log(
      chalk.bold("🚀 STEP 3: Starting migration with monitoring...\n"),
    );
    monitor.start();

    // Process in batches
    const batchSize = CONFIG.migration.batchSize;
    const totalBatches = Math.ceil(s3Objects.length / batchSize);
    let totalStats = {
      successful: 0,
      failed: 0,
      skipped: 0,
      extracted: 0,
      keptAsArchive: 0,
    };

    for (let i = 0; i < s3Objects.length; i += batchSize) {
      const batch = s3Objects.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      console.log(
        chalk.bold.blue(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`),
      );
      console.log(
        chalk.bold.blue(
          `  BATCH ${batchNum}/${totalBatches} (${batch.length} files)`,
        ),
      );
      console.log(
        chalk.bold.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`),
      );

      const processor = new BatchProcessor(batch.length);
      await processor.processBatch(batch, existingFiles);
      const batchStats = processor.getStats();
      processor.finish();

      // Update total stats
      totalStats.successful += batchStats.successful;
      totalStats.failed += batchStats.failed;
      totalStats.skipped += batchStats.skipped;
      totalStats.extracted += batchStats.extracted;
      totalStats.keptAsArchive += batchStats.keptAsArchive;

      // Brief pause between batches
      if (i + batchSize < s3Objects.length) {
        console.log(chalk.gray("\nPausing between batches...\n"));
        await sleep(2000);
      }
    }

    monitor.stop();

    // Final report
    console.log(
      chalk.bold.green(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         MIGRATION COMPLETE!                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ✅ Successful:   ${totalStats.successful.toString().padEnd(57)}║
║  📦 Extracted:    ${totalStats.extracted.toString().padEnd(57)}║
║  🗄️  Archives:     ${totalStats.keptAsArchive.toString().padEnd(57)}║
║  ⏭️  Skipped:      ${totalStats.skipped.toString().padEnd(57)}║
║  ❌ Failed:       ${totalStats.failed.toString().padEnd(57)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`),
    );
  } finally {
    if (dbConnection) {
      await dbConnection.end();
    }
  }
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const options = {
    limit: undefined as number | undefined,
    folder: undefined as string | undefined,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--limit="))
      options.limit = parseInt(arg.split("=")[1]);
    else if (arg.startsWith("--folder=")) options.folder = arg.split("=")[1];
  }

  if (options.help) {
    console.log(
      chalk.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SMART S3 → VPS MIGRATION TOOL                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  npx ts-node src/scripts/migrateS3ToVPS.ts [OPTIONS]

OPTIONS:
  --limit=N         Limit to N files
  --folder=NAME     Migrate specific folder (emails, pdfs, zipped, sample_email_pdfs)
  --help, -h        Show this help

EXAMPLES:
  # Test with 100 files
  npx ts-node src/scripts/migrateS3ToVPS.ts --limit=100
  
  # Migrate only PDFs folder
  npx ts-node src/scripts/migrateS3ToVPS.ts --folder=pdfs
  
  # Full migration
  npx ts-node src/scripts/migrateS3ToVPS.ts

ZIP HANDLING RULES:
  • 'zipped' folder     → Files kept as archives (not extracted)
  • Files with 'all_files' → Kept as archives
  • Document bundles    → Extracted and uploaded individually
  • Nested zips        → Smart extraction based on context
`),
    );
    process.exit(0);
  }

  try {
    await migrateWithRateLimits(options);
  } catch (error: any) {
    console.error(chalk.red(`\n💥 Migration failed: ${error.message}\n`));
    process.exit(1);
  }
}

// Check dependencies
const requiredPackages = [
  "p-limit",
  "mysql2",
  "unzipper",
  "limiter",
  "chalk",
  "cli-progress",
  "pretty-bytes",
];

console.log(
  chalk.yellow(`
📦 Required packages:
npm install --save-dev ${requiredPackages.join(" ")}
`),
);

main();
