"use strict";
import fs from 'fs';
import * as XLSX from "xlsx";
import * as path from 'path';
import multer from 'multer';
import archiver from 'archiver';
import csvParse from 'csv-parse';
import CONSTANTS from '../../common/constants/constants';
const awsS3Bucket = require("../utilities/awsS3Bucket.service");
import CONFIGS from "../../config";

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req:any, file:any, cb:any) => {
        const uploadPath = path.join(__dirname, '..', '../../../public/upload');

        console.log('uploadPath--->?',uploadPath) // Path where files will be stored

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath); // Store files in 'uploads' folder
    },
    filename: (req:any, file:any, cb:any) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext); // Generate a unique filename
    }
});

// Create multer reports middleware
const upload = multer({ storage }).array('file', 10); // Allow up to 10 files

// Middleware to handle form data and file reports
const parseFormData = async (req: any): Promise<{ fields: any; files: { filepath: string; originalFilename: string }[] }> => {
    return new Promise((resolve, reject) => {
        upload(req, req.res, (err: any) => {
            if (err) {
                reject(err);
                return;
            }
            // Normalize fields from the body (e.g., user_id, organization_id)
            const normalizedFields: { [key: string]: any } = {};
            for (const key in req.body) {
                normalizedFields[key] = Array.isArray(req.body[key]) ? req.body[key][0] : req.body[key];
            }

            // Extract files from the uploaded files array
            let fileArray: { filepath: string; originalFilename: string }[] = [];
            if (Array.isArray(req.files)) {
                fileArray = req.files.map((file: any) => ({
                    filepath: file.path,
                    originalFilename: file.originalname,
                }));
            }
             console.log("MULTER---------->")
            resolve({
                fields: normalizedFields,
                files: fileArray,
            });
        });
    });
};

const parseCSVFile = async (filePath: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const records: any[] = [];
        const stream = fs.createReadStream(filePath);

        const parser = stream.pipe(csvParse.parse({ columns: true }));

        parser.on("data", (record: any) => {
            records.push(record);
        });

        parser.on("end", () => {
            resolve(records);
        });

        parser.on("error", (error: any) => {
            reject(error);
        });
    });
};

const parseExcelFile = async (filepath: string): Promise<any[]> => {
    try {
        const workbook = XLSX.readFile(filepath);
        const sheetNames = workbook.SheetNames;
        const firstSheet = sheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        return data;
    } catch (error) {
        console.error("Error parsing Excel file:", error);
        throw error;
    }
};

const createOutputFile = (data: any[], outputDirectory: string, fileName: string): string => {
    try {
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        const outputFilePath = path.join(outputDirectory, fileName);
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ProcessedData');
        XLSX.writeFile(workbook, outputFilePath);

        console.log(`Output file created: ${outputFilePath}`);
        return outputFilePath;
    } catch (error: any) {
        console.error('Error creating output file:', error.message);
        throw error;
    }
};

const deleteFile = async (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Failed to delete file: ${filePath}`, err);
                reject(err);
            } else {
                console.log(`File deleted: ${filePath}`);
                resolve();
            }
        });
    });
};

const uploadPdfFileToS3Bucket = async (organization_id:any,body: any) => {
    try {
        // Process the form to get the image information
        const s3FolderPath = CONSTANTS.AWS.S3_BUCKET.FOLDER_NAME + '/organization_'+organization_id+'/pdfs' ;

        // Check if "folder" exists on S3 by listing objects with a specific prefix
        const isFolderExists = await awsS3Bucket.isFolderExists(s3FolderPath);

        // Create "folder" (simulate directory) if it doesn't exist
        if (!isFolderExists) {
            const createFolder = await awsS3Bucket.createFolder(s3FolderPath);
        }

        // Upload the file to the specified "folder" in S3
        const fileStream = fs.createReadStream(body.file_path);
        const result = await awsS3Bucket.uploadFile(fileStream, s3FolderPath, body.file_name);
        return result.key;
    } catch (error:any) {
        console.error(`Error processing form or uploading file: ${error.message}`);
        throw error;
    }
};

const uploadZipFileToS3Bucket = async (organization_id:any,body: any) => {
    try {
        // Process the form to get the image information
        const s3FolderPath = CONSTANTS.AWS.S3_BUCKET.FOLDER_NAME + '/organization_'+organization_id+'/zipped' ;

        // Check if "folder" exists on S3 by listing objects with a specific prefix
        const isFolderExists = await awsS3Bucket.isFolderExists(s3FolderPath);

        // Create "folder" (simulate directory) if it doesn't exist
        if (!isFolderExists) {
            const createFolder = await awsS3Bucket.createFolder(s3FolderPath);
        }
        // Upload the file to the specified "folder" in S3
        const fileStream = fs.createReadStream( body.file_path);
        const result = await awsS3Bucket.uploadFile(fileStream, s3FolderPath, body.file_name);
        return CONFIGS.AWS.S3.BASE_URL+result.key;
    } catch (error:any) {
        console.error(`Error processing form or uploading file: ${error.message}`);
        throw error;
    }
};

const uploadEmailFileToS3Bucket = async (organization_id:any,body: any) => {
    try {
        // Process the form to get the image information

        const filePath = body.file_path;
        const s3FolderPath = CONSTANTS.AWS.S3_BUCKET.FOLDER_NAME + '/organization_'+organization_id+'/emails' ;

        // Check if "folder" exists on S3 by listing objects with a specific prefix
        const isFolderExists = await awsS3Bucket.isFolderExists(s3FolderPath);

        // Create "folder" (simulate directory) if it doesn't exist
        if (!isFolderExists) {
            const createFolder = await awsS3Bucket.createFolder(s3FolderPath);
        }

        const fileName: string =  body.file_name;

        // Upload the file to the specified "folder" in S3
        const fileStream = fs.createReadStream(filePath);
        const result = await awsS3Bucket.uploadFile(fileStream, s3FolderPath, fileName);
        return CONFIGS.AWS.S3.BASE_URL+result.key;
    } catch (error:any) {
        console.error(`Error processing form or uploading file: ${error.message}`);
        throw error;
    }
};

const createZipFile = async (files: string[], file_path: string) => {
    return new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(file_path);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);
        files.forEach((file) => {
            const fileName = path.basename(file);
            archive.file(file, { name: fileName });
        });

        archive.finalize();
    });
};

export default {
    parseFormData: parseFormData,
    parseCSVFile: parseCSVFile,
    parseExcelFile: parseExcelFile,
    deleteFile: deleteFile,
    createOutputFile: createOutputFile,
    createZipFile: createZipFile,
    uploadZipFileToS3Bucket: uploadZipFileToS3Bucket,
    uploadPdfFileToS3Bucket: uploadPdfFileToS3Bucket,
    uploadEmailFileToS3Bucket: uploadEmailFileToS3Bucket
};
