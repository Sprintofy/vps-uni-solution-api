// ============================================
// S3 TO VPS CDN FILE MIGRATION SCRIPT
// ============================================
// Usage:
//   npx ts-node src/scripts/migrateS3ToVPS.ts --dry-run --limit=10
//   npx ts-node src/scripts/migrateS3ToVPS.ts --limit=10
//   npx ts-node src/scripts/migrateS3ToVPS.ts --folder=pdfs --limit=10
//   npx ts-node src/scripts/migrateS3ToVPS.ts
// ============================================

import AWS from "aws-sdk";
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // AWS S3
  aws: { 
    accessKeyId:  process.env.AWS_S3_ACCESS_KEY ||"",
    secretAccessKey:process.env.AWS_S3_SECRET_KEY ||"",
    region: process.env.AWS_S3_REGION || "",
    bucketName: process.env.AWS_S3_BUCKET_NAME || "",
  },

  // VPS CDN
  vps: {
    baseUrl: process.env.FILE_STORAGE_BASE_URL || "https://cdn.digimatrixpro.com",
    publicUrl: process.env.FILE_STORAGE_PUBLIC_URL || "https://cdn.digimatrixpro.com/public",
    apiKey: process.env.FILE_STORAGE_API_KEY || "fss_970ca7cb162cfe13b4514bb26d4f971b6db19018fd9c3e977f3236946b3fc20c",
    bucketName: process.env.FILE_STORAGE_DEFAULT_BUCKET || "organization-files",
  },

  // Migration
  migration: {
    tempDir: path.join(__dirname, "../../temp_migration"),
    s3Prefix: "proofs/organization_1/",
    batchSize: 5,
    retryAttempts: 3,
    retryDelay: 2000,
  },
};

// ============================================
// TYPES
// ============================================

interface S3Object {
  Key: string;
  Size: number;
}

interface PathMapping {
  s3Key: string;
  s3Folder: string;
  vpsFolder: string;
  fileName: string;
}

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

interface MigrationStats {
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  totalBytes: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{ file: string; error: string }>;
  folderStats: Record<string, { count: number; size: number }>;
}

// ============================================
// CLIENTS
// ============================================

const s3 = new AWS.S3({
  accessKeyId: CONFIG.aws.accessKeyId,
  secretAccessKey: CONFIG.aws.secretAccessKey,
  region: CONFIG.aws.region,
});

const vpsClient: AxiosInstance = axios.create({
  baseURL: CONFIG.vps.baseUrl,
  headers: { "X-API-Key": CONFIG.vps.apiKey },
  timeout: 120000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// ============================================
// UTILITIES
// ============================================

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeDelete = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

const getTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, "-");

// ============================================
// PATH TRANSLATION (S3 → VPS, same structure)
// ============================================

function translatePath(s3Key: string): PathMapping {
  const fileName = path.basename(s3Key);

  let s3Folder = "unknown";
  if (s3Key.includes("/emails/")) s3Folder = "emails";
  else if (s3Key.includes("/pdfs/")) s3Folder = "pdfs";
  else if (s3Key.includes("/sample_email_pdfs/")) s3Folder = "sample_email_pdfs";
  else if (s3Key.includes("/zipped/")) s3Folder = "zipped";

  // Same structure: proofs/organization_1/pdfs/ → organization_1/pdfs/
  const vpsFolder = `organization_1/${s3Folder}`;

  return { s3Key, s3Folder, vpsFolder, fileName };
}

// ============================================
// S3 OPERATIONS (READ ONLY)
// ============================================

async function listS3Objects(prefix: string): Promise<S3Object[]> {
  const allObjects: S3Object[] = [];
  let continuationToken: string | undefined;

  console.log(`\n📂 Listing S3 objects...`);
  console.log(`   Bucket: ${CONFIG.aws.bucketName}`);
  console.log(`   Prefix: ${prefix}`);
  console.log(`   ⚠️  READ ONLY - S3 files will NOT be deleted\n`);

  do {
    const response = await s3.listObjectsV2({
      Bucket: CONFIG.aws.bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }).promise();

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && !obj.Key.endsWith("/") && obj.Size && obj.Size > 0) {
          allObjects.push({ Key: obj.Key, Size: obj.Size });
        }
      }
    }

    continuationToken = response.NextContinuationToken;

    if (allObjects.length % 500 === 0 && allObjects.length > 0) {
      console.log(`   Found ${allObjects.length} objects...`);
    }
  } while (continuationToken);

  console.log(`   ✅ Total: ${allObjects.length} files\n`);
  return allObjects;
}

async function downloadFromS3(s3Key: string, localPath: string): Promise<void> {
  ensureDir(path.dirname(localPath));

  const fileStream = fs.createWriteStream(localPath);
  const s3Stream = s3.getObject({
    Bucket: CONFIG.aws.bucketName,
    Key: s3Key,
  }).createReadStream();

  return new Promise((resolve, reject) => {
    s3Stream.pipe(fileStream);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
    s3Stream.on("error", reject);
  });
}

// ============================================
// VPS UPLOAD (API handles file_storage_db insert)
// ============================================

async function uploadToVPS(localPath: string, vpsFolder: string, fileName: string): Promise<UploadResult> {
  for (let attempt = 1; attempt <= CONFIG.migration.retryAttempts; attempt++) {
    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(localPath), fileName);
      formData.append("folder", vpsFolder);
      formData.append("isPublic", "true");

      const response = await vpsClient.post(
        `/api/v1/files/upload/${CONFIG.vps.bucketName}`,
        formData,
        { headers: { ...formData.getHeaders() } }
      );

      return {
        success: true,
        publicUrl: response.data.data.file.publicUrl,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;

      if (attempt < CONFIG.migration.retryAttempts) {
        console.log(`      ⚠️ Attempt ${attempt} failed, retrying...`);
        await sleep(CONFIG.migration.retryDelay * attempt);
      } else {
        return { success: false, error: errMsg };
      }
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// ============================================
// REPORT
// ============================================

function generateReport(stats: MigrationStats, dryRun: boolean): string {
  const duration = stats.endTime
    ? (stats.endTime.getTime() - stats.startTime.getTime()) / 1000
    : 0;

  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                        S3 TO VPS MIGRATION REPORT                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
${dryRun ? "║  ⚠️  DRY RUN - No changes made                                              ║\n╠══════════════════════════════════════════════════════════════════════════════╣" : ""}
║  ✅ S3 files NOT deleted - READ ONLY                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

📅 Start:    ${stats.startTime.toISOString()}
📅 End:      ${stats.endTime?.toISOString() || "In Progress"}
⏱️  Duration: ${duration.toFixed(2)}s (${(duration / 60).toFixed(2)} min)

════════════════════════════════════════════════════════════════════════════════
                              SUMMARY
════════════════════════════════════════════════════════════════════════════════

  Total Files:      ${stats.totalFiles}
  ✅ Successful:    ${stats.successfulUploads}
  ❌ Failed:        ${stats.failedUploads}
  Success Rate:     ${stats.totalFiles > 0 ? ((stats.successfulUploads / stats.totalFiles) * 100).toFixed(2) : 0}%
  Data Transferred: ${formatBytes(stats.totalBytes)}

════════════════════════════════════════════════════════════════════════════════
                              BY FOLDER
════════════════════════════════════════════════════════════════════════════════

${Object.entries(stats.folderStats)
  .filter(([_, d]) => d.count > 0)
  .map(([f, d]) => `  📁 ${f.padEnd(20)}: ${String(d.count).padStart(5)} files (${formatBytes(d.size)})`)
  .join("\n")}

${stats.errors.length > 0 ? `
════════════════════════════════════════════════════════════════════════════════
                              ERRORS (${stats.errors.length})
════════════════════════════════════════════════════════════════════════════════

${stats.errors.slice(0, 20).map((e) => `  ❌ ${e.file}\n     ${e.error}`).join("\n\n")}
${stats.errors.length > 20 ? `\n  ... +${stats.errors.length - 20} more` : ""}
` : `
════════════════════════════════════════════════════════════════════════════════
  ✅ No errors!
════════════════════════════════════════════════════════════════════════════════
`}
`;
}

// ============================================
// MAIN MIGRATION
// ============================================

async function migrate(options: {
  dryRun: boolean;
  limit?: number;
  folder?: string;
  startFrom: number;
}): Promise<MigrationStats> {
  const { dryRun, limit, folder, startFrom } = options;

  const stats: MigrationStats = {
    totalFiles: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalBytes: 0,
    startTime: new Date(),
    errors: [],
    folderStats: {
      emails: { count: 0, size: 0 },
      pdfs: { count: 0, size: 0 },
      sample_email_pdfs: { count: 0, size: 0 },
      zipped: { count: 0, size: 0 },
    },
  };

  let prefix = CONFIG.migration.s3Prefix;
  if (folder) prefix = `${CONFIG.migration.s3Prefix}${folder}/`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                        S3 → VPS CDN MIGRATION                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Mode:       ${(dryRun ? "🔍 DRY RUN" : "🚀 LIVE").padEnd(50)}║
║  Source:     s3://${CONFIG.aws.bucketName.padEnd(43)}║
║  Target:     ${CONFIG.vps.baseUrl.padEnd(50)}║
║  Folder:     ${(folder || "all").padEnd(50)}║
║  Limit:      ${(limit?.toString() || "none").padEnd(50)}║
║  Start:      ${startFrom.toString().padEnd(50)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ⚠️  S3 FILES WILL NOT BE DELETED                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  ensureDir(CONFIG.migration.tempDir);

  try {
    // List S3 objects
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 1: LIST S3 OBJECTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let s3Objects = await listS3Objects(prefix);

    if (startFrom > 0) {
      s3Objects = s3Objects.slice(startFrom);
      console.log(`   Skipping first ${startFrom} files\n`);
    }
    if (limit) {
      s3Objects = s3Objects.slice(0, limit);
      console.log(`   Limited to ${limit} files\n`);
    }

    stats.totalFiles = s3Objects.length;

    if (s3Objects.length === 0) {
      console.log("   ⚠️ No files to migrate.\n");
      stats.endTime = new Date();
      return stats;
    }

    // Show folder breakdown
    console.log("   📊 Files by folder:");
    const tempStats: Record<string, { count: number; size: number }> = {};
    for (const obj of s3Objects) {
      const m = translatePath(obj.Key);
      if (!tempStats[m.s3Folder]) tempStats[m.s3Folder] = { count: 0, size: 0 };
      tempStats[m.s3Folder].count++;
      tempStats[m.s3Folder].size += obj.Size;
    }
    for (const [f, d] of Object.entries(tempStats)) {
      console.log(`      ${f}: ${d.count} files (${formatBytes(d.size)})`);
    }

    // Migrate
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`STEP 2: MIGRATE ${s3Objects.length} FILES`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const batchSize = CONFIG.migration.batchSize;
    const totalBatches = Math.ceil(s3Objects.length / batchSize);

    for (let i = 0; i < s3Objects.length; i += batchSize) {
      const batch = s3Objects.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      console.log(`\n📦 Batch ${batchNum}/${totalBatches}`);
      console.log("─────────────────────────────────────────────────────────────");

      for (const s3Obj of batch) {
        const mapping = translatePath(s3Obj.Key);
        const localPath = path.join(CONFIG.migration.tempDir, mapping.fileName);

        console.log(`\n   📄 ${mapping.fileName}`);
        console.log(`      ${mapping.s3Folder}/ → ${mapping.vpsFolder}/ (${formatBytes(s3Obj.Size)})`);

        if (dryRun) {
          console.log(`      🔍 [DRY RUN] Would upload`);
          stats.successfulUploads++;
          stats.folderStats[mapping.s3Folder].count++;
          stats.folderStats[mapping.s3Folder].size += s3Obj.Size;
          stats.totalBytes += s3Obj.Size;
          continue;
        }

        try {
          // Download
          console.log(`      ⬇️  Downloading...`);
          await downloadFromS3(s3Obj.Key, localPath);

          // Upload
          console.log(`      ⬆️  Uploading...`);
          const result = await uploadToVPS(localPath, mapping.vpsFolder, mapping.fileName);

          if (result.success) {
            stats.successfulUploads++;
            stats.totalBytes += s3Obj.Size;
            stats.folderStats[mapping.s3Folder].count++;
            stats.folderStats[mapping.s3Folder].size += s3Obj.Size;
            console.log(`      ✅ ${result.publicUrl}`);
          } else {
            stats.failedUploads++;
            stats.errors.push({ file: s3Obj.Key, error: result.error || "Unknown" });
            console.log(`      ❌ ${result.error}`);
          }
        } catch (error: any) {
          stats.failedUploads++;
          stats.errors.push({ file: s3Obj.Key, error: error.message });
          console.log(`      ❌ ${error.message}`);
        } finally {
          safeDelete(localPath);
        }
      }

      const progress = (((i + batch.length) / s3Objects.length) * 100).toFixed(1);
      console.log(`\n   📈 ${progress}% | ✅ ${stats.successfulUploads} | ❌ ${stats.failedUploads}`);

      if (i + batchSize < s3Objects.length && !dryRun) {
        await sleep(1000);
      }
    }

    // Report
    stats.endTime = new Date();
    const report = generateReport(stats, dryRun);
    console.log(report);

    // Save
    const ts = getTimestamp();
    const reportPath = path.join(CONFIG.migration.tempDir, `report_${ts}.txt`);
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report: ${reportPath}\n`);

    return stats;

  } catch (error: any) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    throw error;
  }
}

// ============================================
// CLI
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    dryRun: false,
    limit: undefined as number | undefined,
    folder: undefined as string | undefined,
    startFrom: 0,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run" || arg === "-d") result.dryRun = true;
    else if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg.startsWith("--limit=")) result.limit = parseInt(arg.split("=")[1]);
    else if (arg.startsWith("--folder=")) result.folder = arg.split("=")[1];
    else if (arg.startsWith("--start=")) result.startFrom = parseInt(arg.split("=")[1]);
  }

  return result;
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    S3 → VPS CDN MIGRATION TOOL                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  npx ts-node src/scripts/migrateS3ToVPS.ts [OPTIONS]

OPTIONS:
  --dry-run, -d     Simulate (no changes)
  --limit=N         Limit to N files
  --folder=NAME     Only migrate: emails, pdfs, sample_email_pdfs, zipped
  --start=N         Skip first N files
  --help, -h        Show help

EXAMPLES:
  npx ts-node src/scripts/migrateS3ToVPS.ts --dry-run --limit=10
  npx ts-node src/scripts/migrateS3ToVPS.ts --folder=pdfs --limit=10
  npx ts-node src/scripts/migrateS3ToVPS.ts

⚠️  S3 files are NEVER deleted!
`);
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const opts = parseArgs();

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await migrate({
      dryRun: opts.dryRun,
      limit: opts.limit,
      folder: opts.folder,
      startFrom: opts.startFrom,
    });
    console.log("✅ Migration completed!\n");
  } catch (error: any) {
    console.error(`💥 Failed: ${error.message}\n`);
    process.exit(1);
  }
}

main();