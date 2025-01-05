'use strict';
import CONSTANTS from '../common/constants/constants';
import fileService from '../services/common/file.service';
import * as XLSX from "xlsx";
import * as path from 'path';

const import_clients = async (req: any) => {
    try {
        const { fields, files } = await fileService.parseFormData(req) as any;

        if (!files || files.length === 0) {
            console.warn("No files uploaded.");
            return;
        }

        for (const file of files) {
            console.log("Processing file:", file.originalFilename);
            let parsedData: any[] = [];

            try {
                // Parse the file based on its extension
                if (file.originalFilename.endsWith(".csv")) {
                    parsedData = await fileService.parseCSVFile(file.filepath);
                } else if (file.originalFilename.endsWith(".xlsx") || file.originalFilename.endsWith(".xls")) {
                    parsedData = await fileService.parseExcelFile(file.filepath);
                } else {
                    console.warn("Unsupported file type:", file.originalFilename);
                    continue; // Skip unsupported files
                }

                // Process parsed data
                await processData(req, file, fields, parsedData);
                await fileService.deleteFile(file.filepath);
            } catch (error: any) {
                console.error(`Error processing file ${file.originalFilename}:`, error.message);
                await fileService.deleteFile(file.filepath);
            }
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const processData = async (req: any, file: any, fields: any, data: any[]) => {
    try {
        console.log("Processing data...");
        console.log("File:", file.originalFilename);
        console.log("Fields:", fields);
        console.log("Parsed Data:", data);

        // Perform additional processing here (e.g., validation, status addition, etc.)
        const processedData = data.map((record) => ({
            ...record,
            status: record.name ? "Success" : "Failed", // Example validation logic
        }));

        // Define output file name
        const outputFileName = `output_${Date.now()}.xlsx`;
        const outputFilePath = path.join(__dirname, '..', 'output', outputFileName);

        // Convert processed data to an Excel file
        console.log(`Excel file created at: ${outputFilePath}`);

        // todo Optionally, upload the file to an S3 bucket
        const s3UploadPath = `processed/${outputFileName}`;

        // todo delete the local file after uploading s3
        // Log processed data or take further actions
        console.log("Processed Data with Status:", processedData);

        // Optionally, save the processed data back to a file or database here
    } catch (error: any) {
        console.error("Error processing data:", error.message);
        throw error;
    }
};

export default {
    import_clients: import_clients
}
