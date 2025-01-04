'use strict';
import CONSTANTS from '../common/constants/constants';
import fileService from '../services/common/file.service';


const import_clients = async (req: any) => {
    try {
        const {fields, files} = await fileService.parseFormData(req) as any;

        for (const file of files) {
            console.log("Processing file:", file.originalFilename);
            let parsedData: any[] = [];
            if (file.originalFilename.endsWith(".csv")) {
                parsedData = await fileService.parseCSVFile(file.filepath);
            } else if (file.originalFilename.endsWith(".xlsx") || file.originalFilename.endsWith(".xls")) {
                parsedData = await fileService.parseExcelFile(file.filepath);
            } else {
                console.warn("Unsupported file type:", file.originalFilename);
                continue;
            }
            // Call processData with parsed data
            processData(fields, parsedData);
        }
    } catch (error: any) {
        throw new Error(`Error: ${error.message}`);
    }
};

const processData = (fields: any, data: any[]) => {
    console.log("Processing data...");
    console.log("Fields:", fields);
    console.log("Data:", data);
};

export default {
    import_clients: import_clients
}
