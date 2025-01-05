"use strict";
import fs from 'fs';
import * as XLSX from "xlsx";
import * as path from 'path';
import formidable from 'formidable';
import csvParse from 'csv-parse';
import CONSTANTS from '../../common/constants/constants';


// Function to parse form data and get file path

const parseFormData = async (req: any): Promise<{ fields: any; files: { filepath: string; originalFilename: string }[] }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: true });
        form.parse(req, (err, fields, files: any) => {
            if (err) {
                reject(err);
                return;
            }

            // Normalize fields
            const normalizedFields: { [key: string]: any } = {};
            for (const key in fields) {
                normalizedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
            }

            // Extract files as an array
            let fileArray: { filepath: string; originalFilename: string }[] = [];
            if (Array.isArray(files.file)) {
                fileArray = files.file.map((file:any) => ({
                    filepath: file.filepath,
                    originalFilename: file.originalFilename,
                }));
            } else if (files.file) {
                fileArray = [
                    {
                        filepath: files.file.filepath,
                        originalFilename: files.file.originalFilename,
                    },
                ];
            }

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

        // Use the csvParse function with .parse
        const parser = stream.pipe(csvParse.parse({ columns: true }));

        parser.on("data", (record: any) => {
            records.push(record);  // Collect records
        });

        parser.on("end", () => {
            resolve(records);  // Resolve once parsing is complete
        });

        parser.on("error", (error: any) => {
            reject(error);  // Reject on error
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
        // Ensure the output directory exists
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        const outputFilePath = path.join(outputDirectory, fileName);

        // Create the Excel file
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ProcessedData');

        // Write the file to disk
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

export default {
    parseFormData,
    parseCSVFile,
    parseExcelFile,
    deleteFile,
    createOutputFile
}
