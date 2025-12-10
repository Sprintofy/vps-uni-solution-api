// ============================================
// FILE STORAGE SERVICE WRAPPER
// Replaces AWS S3 with your custom File Storage Service
// ============================================

import axios from "axios";
import type { AxiosInstance } from "axios/index";

import FormData from "form-data";
import fs from "fs";
import path from "path";
import CONFIG from "../../config";

class FileStorageService {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private tenantSlug: string;
  private defaultBucket: string;
  private publicUrl: string;
  private baseURL: string; // ADD THIS

  constructor() {
    this.apiKey = CONFIG.FILE_STORAGE.API_KEY;
    this.tenantSlug = CONFIG.FILE_STORAGE.TENANT_SLUG;
    this.defaultBucket = CONFIG.FILE_STORAGE.DEFAULT_BUCKET;
    this.publicUrl = CONFIG.FILE_STORAGE.PUBLIC_URL;
    this.baseURL = CONFIG.FILE_STORAGE.BASE_URL; // ADD THIS

    // Create axios instance with default config
    this.apiClient = axios.create({
      baseURL: this.baseURL, // Use the property here
      headers: {
        "X-API-Key": this.apiKey,
      },
    });
  }

  /**
   * Translate old AWS S3 paths to new file storage paths
   */
  private translateLegacyPath(legacyPath: string): string {
    // Remove any base URL if present
    let path = legacyPath.replace(/^https?:\/\/[^\/]+\//, "");

    // Remove 'public/' and 'files/' prefixes if present
    path = path.replace(/^public\//, "").replace(/^files\//, "");

    // Handle old AWS patterns
    if (path.startsWith("proofs/")) {
      // proofs/organization_1/pdfs/file.pdf -> organization_1/emails/file.pdf
      path = path
        .replace("proofs/", "")
        .replace("/pdfs/", "/emails/")
        .replace("/sample_email_pdfs/", "/emails/");
    }

    // Remove tenant/bucket prefixes if they exist
    if (path.startsWith(`${this.tenantSlug}/`)) {
      path = path.replace(`${this.tenantSlug}/${this.defaultBucket}/`, "");
    }

    return path;
  }

  /**
   * Get the database path from full file path
   * Extracts just the organization path: organization_1/emails/filename.pdf
   */
  private getDatabasePath(fullPath: string): string {
    // Remove any URLs if present
    let cleanPath = fullPath
      .replace(this.publicUrl + "/", "")
      .replace(this.baseURL + "/", "")
      .replace(/^https?:\/\/[^\/]+\//, ""); // Remove any other URLs

    // Remove common prefixes
    cleanPath = cleanPath
      .replace("public/", "")
      .replace("files/", "")
      .replace(`${this.tenantSlug}/${this.defaultBucket}/`, "");

    // If path still contains tenant/bucket, remove it
    if (cleanPath.includes(this.tenantSlug)) {
      const parts = cleanPath.split("/");
      const tenantIndex = parts.indexOf(this.tenantSlug);
      if (tenantIndex !== -1) {
        // Remove tenant and bucket parts
        parts.splice(tenantIndex, 2);
        cleanPath = parts.join("/");
      }
    }

    // Return just the organization path: organization_1/emails/filename.pdf
    return cleanPath;
  }

  // ============================================
  // Create Folder Structure (for organization)
  // ============================================
  async createFolder(folderName: string): Promise<void> {
    try {
      // In your file storage service, folders are created automatically with files
      // This is just for compatibility
      console.log(
        `Folder will be created with first file upload: ${folderName}`
      );
    } catch (error: any) {
      console.error(`Error creating folder: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Check if Folder Exists
  // ============================================
  async isFolderExists(folderName: string): Promise<boolean> {
    try {
      // List files in the folder to check if it exists
      const response = await this.apiClient.get(
        `/api/v1/files/bucket/${this.defaultBucket}/folder`,
        {
          params: { folder: folderName },
        }
      );
      return response.data.data && response.data.data.length > 0;
    } catch (error: any) {
      // If 404, folder doesn't exist
      if (error.response?.status === 404) {
        return false;
      }
      console.error(`Error checking folder existence: ${error.message}`);
      return false;
    }
  }

  // ============================================
  // Upload File to Storage
  // ============================================
  async uploadFile(
    fileStream: any,
    folderPath: string,
    fileName: string
  ): Promise<any> {
    try {
      const formData = new FormData();

      if (typeof fileStream === "string") {
        fileStream = fs.createReadStream(fileStream);
      }

      formData.append("file", fileStream, fileName);
      formData.append("folder", folderPath);
      formData.append("isPublic", "true");

      const response = await this.apiClient.post(
        `/api/v1/files/upload/${this.defaultBucket}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      const file = response.data.data.file;

      // Get the clean database path
      const dbPath = this.getDatabasePath(file.filePath);

      console.log("File upload response:", {
        originalPath: file.filePath,
        dbPath: dbPath,
        publicUrl: file.publicUrl,
      });

      return {
        key: dbPath, // This is what gets saved to database
        Key: dbPath,
        Location: file.publicUrl,
        url: file.publicUrl,
      };
    } catch (error: any) {
      console.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Upload File from Local Path
  // ============================================
  async uploadLocalFile(filePath: string, remotePath: string): Promise<any> {
    try {
      const fileName = path.basename(remotePath);
      const folderPath = path.dirname(remotePath);
      const fileStream = fs.createReadStream(filePath);

      return await this.uploadFile(fileStream, folderPath, fileName);
    } catch (error: any) {
      console.error(`Error uploading local file: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Upload Excel File
  // ============================================
  async uploadExcelfile(data: Buffer, key: string): Promise<any> {
    try {
      const fileName = path.basename(key);
      const folderPath = path.dirname(key);

      const formData = new FormData();
      formData.append("file", data, {
        filename: fileName,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      formData.append("folder", folderPath);
      formData.append("isPublic", "true");

      const response = await this.apiClient.post(
        `/api/v1/files/upload/${this.defaultBucket}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      const file = response.data.data.file;
      const dbPath = this.getDatabasePath(file.filePath);

      return {
        Location: file.publicUrl,
        Key: dbPath,
      };
    } catch (error: any) {
      console.error("Error uploading Excel to storage:", error);
      throw error;
    }
  }

  // ============================================
  // Download File from Storage
  // ============================================
  async downloadFileFromS3(key: string, localPath: string): Promise<void> {
    try {
      // Skip null or invalid keys
      if (!key || key === "null" || key === "undefined") {
        throw new Error(`Invalid key: ${key}`);
      }

      // If it's a full URL, extract the path
      let filePath = key;
      if (key.startsWith("http")) {
        const url = new URL(key);
        filePath = url.pathname.replace(/^\/public\//, "");
      }

      // Translate legacy path
      const translatedPath = this.translateLegacyPath(filePath);

      // Extract folder and filename
      let folderPath = path.dirname(translatedPath);
      const fileName = path.basename(translatedPath);

      // Ensure folder path starts with /
      if (!folderPath.startsWith("/")) {
        folderPath = "/" + folderPath;
      }

      console.log(`Attempting to download: ${key}`);
      console.log(`Translated path: ${translatedPath}`);
      console.log(`Searching in folder: ${folderPath}`);
      console.log(`Looking for file: ${fileName}`);

      // Try to find the file
      const response = await this.apiClient.get(
        `/api/v1/files/bucket/${this.defaultBucket}`,
        {
          params: {
            folder: folderPath,
            limit: 1000,
          },
        }
      );

      // Try multiple matching strategies
      let file = response.data.data.find((f: any) => {
        // Exact match on stored name
        if (f.storedName === fileName) return true;
        // Exact match on original name
        if (f.originalName === fileName) return true;
        // Partial match (for files with timestamps)
        const baseFileName = fileName.split("_").slice(0, -1).join("_");
        if (f.originalName && f.originalName.includes(baseFileName))
          return true;
        if (f.storedName && f.storedName.includes(baseFileName)) return true;
        // Match by client code (e.g., PRBC172401)
        const clientCode = fileName.split("_")[0];
        if (
          clientCode &&
          f.originalName &&
          f.originalName.startsWith(clientCode)
        )
          return true;
        return false;
      });

      if (!file) {
        console.error(`File not found in folder ${folderPath}:`, fileName);
        console.error(
          `Available files:`,
          response.data.data.map((f: any) => f.originalName)
        );
        throw new Error(`File not found: ${fileName} in ${folderPath}`);
      }

      console.log(`Found file with ID: ${file.id}`);

      // Download the file
      const downloadResponse = await this.apiClient.get(
        `/api/v1/files/${file.id}/download`,
        { responseType: "stream" }
      );

      const writer = fs.createWriteStream(localPath);
      downloadResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } catch (error: any) {
      console.error(`Error downloading file ${key}: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Get Public URL for File
  // ============================================
  async getPublicUrlForS3Path(s3Path: string): Promise<string> {
    try {
      if (s3Path.startsWith("http")) {
        return s3Path;
      }

      // Translate legacy path
      const translatedPath = this.translateLegacyPath(s3Path);

      return `${this.publicUrl}/${this.tenantSlug}/${this.defaultBucket}/${translatedPath}`;
    } catch (error: any) {
      console.error(`Error generating public URL: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Get File Content as String
  // ============================================
  async getS3Object(s3Path: string): Promise<string> {
    try {
      const translatedPath = this.translateLegacyPath(s3Path);

      const response = await this.apiClient.get(
        `/api/v1/files/bucket/${this.defaultBucket}`,
        {
          params: {
            folder: path.dirname(translatedPath),
            limit: 1000,
          },
        }
      );

      const fileName = path.basename(translatedPath);
      const file = response.data.data.find(
        (f: any) => f.storedName === fileName || f.originalName === fileName
      );

      if (!file) {
        throw new Error(`File not found: ${s3Path}`);
      }

      const contentResponse = await this.apiClient.get(
        `/api/v1/files/${file.id}/download`,
        { responseType: "text" }
      );

      return contentResponse.data;
    } catch (error: any) {
      console.error(`Error fetching file content at ${s3Path}:`, error.message);
      throw error;
    }
  }

  // ============================================
  // Delete File
  // ============================================
  async deleteFile(key: string): Promise<boolean> {
    try {
      const translatedPath = this.translateLegacyPath(key);

      const response = await this.apiClient.get(
        `/api/v1/files/bucket/${this.defaultBucket}`,
        {
          params: {
            folder: path.dirname(translatedPath),
            limit: 1000,
          },
        }
      );

      const fileName = path.basename(translatedPath);
      const file = response.data.data.find(
        (f: any) => f.storedName === fileName || f.originalName === fileName
      );

      if (!file) {
        console.warn(`File not found for deletion: ${key}`);
        return false;
      }

      await this.apiClient.delete(`/api/v1/files/${file.id}`);
      return true;
    } catch (error: any) {
      console.error(`Error deleting file: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Create Signed URL
  // ============================================
  async createSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const translatedPath = this.translateLegacyPath(key);

      const response = await this.apiClient.get(
        `/api/v1/files/bucket/${this.defaultBucket}`,
        {
          params: {
            folder: path.dirname(translatedPath),
            limit: 1000,
          },
        }
      );

      const fileName = path.basename(translatedPath);
      const file = response.data.data.find(
        (f: any) => f.storedName === fileName || f.originalName === fileName
      );

      if (!file) {
        throw new Error(`File not found: ${key}`);
      }

      const signedUrlResponse = await this.apiClient.post(
        `/api/v1/files/${file.id}/signed-url`,
        { expiresIn }
      );

      return signedUrlResponse.data.data.signedUrl;
    } catch (error: any) {
      console.error(`Error creating signed URL: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
export default new FileStorageService();
