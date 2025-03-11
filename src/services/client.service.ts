'use strict';
import CONSTANTS from '../common/constants/constants';
import fileService from './common/file.service';
import clientModel from '../models/client.model';
import moment    from "moment";
import * as path from 'path';
import {error} from "winston";


const fetch_all_clients_with_pagination = async (req: any) => {
    try {
        const clients = await clientModel.fetch_all_clients_with_pagination(req.body.organization_id,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await clientModel.fetch_all_clients_count(req.body.organization_id,req.body.query || "");
        return {
            data:clients,
            total:total[0].total
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const fetch_all_clients = async (req: any) => {
    try {
        const clients = await clientModel.fetch_all_clients(req.query.organization_id);
        return clients
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const import_clients = async (req: any) => {
    try {
        const { fields, files } = await fileService.parseFormData(req) as any;
        if (!files || files.length === 0) {
            console.warn("No files uploaded.");
            return;
        }
        for (const file of files) {
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

// Mapping object that converts the keys
const keyMapping = {
    'CODE': 'client_code',
    'NAME': 'client_name',
    'BRANCHCODE': 'branch_code',
    'SUBBROKERCODE': 'sub_broker_code',
    'DEALERCODE': 'dealer_code',
    'PANNO_MASK': 'pan_number',
    'AADHAR_NO': 'aadhar_number',
    'MOBILE': 'mobile',
    'EMAILID': 'email',
    'DEFAULT DP': 'default_dp',
    'BANKNAME': 'bank_name',
    'BANKACCOUNTNO': 'bank_account_number',
    'BANKIFSCCODE': 'bank_ifsc_code',
    'ADDRESS': 'address_1',
    'DOB': 'date_of_birth',
    'ACTIVEFROM': 'active_from',
    'INACTIVEFROM': 'inactive_from',
    'ACSTATUS': 'account_status'
} as any;

const mapAndTrimData = async (data: any[], keyMapping: Record<string, string>) => {
    const transformedData = await Promise.all(
        data.map(async (item) => {
            let transformedItem: any = {};
            for (let key in item) {
                if (item.hasOwnProperty(key)) {
                    // Get the new key from the mapping
                    const newKey = keyMapping[key] || key; // Use original key if no mapping exists

                    // Format the value (date or string)
                    let formattedValue = item[key];

                    // Format the value if it's a string or date
                    // formattedValue = await formatRecordValues(formattedValue);

                    // Trim both the key and the value
                    transformedItem[newKey] = typeof formattedValue === 'string' ? formattedValue.trim() : formattedValue;
                }
            }
            return transformedItem;
        })
    );

    return transformedData;
};

const dateFormats = [
    /\d{2}\/\d{2}\/\d{4}/,  // dd/mm/yyyy
    /\d{4}\/\d{2}\/\d{2}/,  // yyyy/mm/dd
    /\d{4}-\d{2}-\d{2}/,     // YYYY-MM-DD
    /\d{2}-\d{2}-\d{4}/      // DD-MM-YYYY
];

const formatRecordValues = async (value: any)=> {
    try {
     if (typeof value === 'string') {
         const matchingFormat = dateFormats.find(regex => value.match(regex));
         if(matchingFormat) {
             // format date
             const dateFormats = ['DD/MM/YYYY','DD-MM-YYYY','DD_MM_YYYY',
                 'YYYY-MM-DD','YYYY/MM/DD','YYYY_MM_DD',
                 'MM-DD-YYYY','MM/DD/YYYY','MM_DD_YYYY',
                 'MMMM DD, YYYY',
                 'DD MMM YYYY',
                 'DD-MMM-YYYY'];
             if(moment(value, dateFormats, true).isValid())
                 return `'${moment(value, dateFormats, true).format("YYYY-MM-DD")}'`;
         } else {
             // Escape single quotes in strings
             return `'${value.replace(/'/g, "''")}'`;
         }
        } else {
            return `'${value}'`;
        }
    } catch (error) {
        console.error('Error fetching table columns:', error);
        return value;
    }
}

const processData = async (req: any, file: any, fields: any, data: any[]) => {
    try {

            await saveFileLog(req, file, fields);

            // Perform additional processing here (e.g., validation, status addition, etc.)
            const mappedData = await mapAndTrimData(data,keyMapping);

            await saveBulkClientInfo(req, fields, mappedData);

            // todo delete the local file after uploading s3

        return true;
    } catch (error: any) {
        console.error("Error processing data:", error.message);
        throw error;
    }
};

const saveBulkClientInfo = async(req:any,fields:any,data:any)=> {
    try {
        // Process each client in parallel (1 - Create Client, 2 - Create Client Profile)
        const clientPromises = data.map((client: any) => {
            return saveClient(req,fields,client).then((clientInfo:any) => {
                client.client_id = clientInfo.insertId;
                client.organization_id = fields.organization_id;
                // Use client ID to create profile and address concurrently
                return Promise.all([
                    saveClientAddress(req,client),  // Pass clientInfo to save the address
                    saveClientProfile(req,client)   // Pass clientInfo to save the profile
                ]);

            });
        });

        // Wait for all client creation processes to finish
        const result = await Promise.all(clientPromises);

        // Wait for all client creation processes to finish
        return { success: true, message: 'Clients processed successfully', data: result };

    } catch (error) {
        console.error('Error processing bulk clients:', error);
        throw new Error('Error processing bulk client information');
    }
}

const save_client_info = async(req:any)=> {
    try {
        console.log(req)
        const results = await saveClient(req,null,req.body);

        if(!results) throw  error("Error Saving client info");

        req.body.client_id = results.insertId;

        const [addressResult, profileResult] = await Promise.all([
            saveClientAddress(req, req.body),
            saveClientProfile(req, req.body)
        ]);

        return req.body;
    } catch (error) {
        console.error('Error processing bulk clients:', error);
        throw new Error('Error processing bulk client information');
    }
}

/************* Mysql Curd Service ************/

const saveClient= async(req:any,fields:any,body:any)=> {
    let client_info = {
        organization_id: req.user.organization_id || 1,
        created_by: req.user.created_by || 0,
        updated_by: req.user.updated_by || 0,
    } as any;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "")client_info.client_code = body.client_code;
    if (body.client_name !== undefined && body.client_name !== null && body.client_name !== "")client_info.client_name = body.client_name;
    if (body.mobile !== undefined && body.mobile !== null && body.mobile !== "")client_info.mobile = body.mobile;
    if (body.email !== undefined && body.email !== null && body.email !== "")client_info.email = body.email;
    if (body.branch_code !== undefined && body.branch_code !== null && body.branch_code !== "")client_info.branch_code = body.branch_code;
    if (body.sub_broker_code !== undefined && body.sub_broker_code !== null && body.sub_broker_code !== "") client_info.sub_broker_code = body.sub_broker_code;
    if (body.dealer_code !== undefined && body.dealer_code !== null && body.dealer_code !== "")client_info.dealer_code = body.dealer_code;
    console.log(client_info);
    return await clientModel.saveClient(client_info);
}

const saveClientProfile= async(req:any,body:any)=> {
    try {
        let client_profile = {
            client_id:body.client_id,
            organization_id: req.user.organization_id || 1,
            created_by:req.user.created_by || 0,
            updated_by:req.user.updated_by || 0,
        } as any;

        if (body.pan_number !== undefined && body.pan_number !== null && body.pan_number !== "") client_profile.pan_number = body.pan_number;
        if (body.bank_name !== undefined && body.bank_name !== null && body.bank_name !== "") client_profile.bank_name = body.bank_name;
        if (body.bank_account_number !== undefined && body.bank_account_number !== null && body.bank_account_number !== "") client_profile.bank_account_number = body.bank_account_number;
        if (body.bank_ifsc_code !== undefined && body.bank_ifsc_code !== null && body.bank_ifsc_code !== "") client_profile.bank_ifsc_code = body.bank_ifsc_code;
       // if (body.date_of_birth !== undefined && body.date_of_birth !== null && body.date_of_birth !== "")client_profile.date_of_birth = body.date_of_birth;
        if (body.default_dp !== undefined && body.default_dp !== null && body.default_dp !== "") client_profile.default_dp = body.default_dp;

        return await clientModel.saveClientProfile(client_profile);

    } catch (error: any) {
        console.error(`Failed to save client profile: ${error.message}`);
        throw error;
    }
}

const saveClientAddress= async(req:any,body:any)=> {
    try {
        let client_address = {
            client_id:body.client_id,
            organization_id:req.user.organization_id || 1,
        } as any;

        if (body.address_1 !== undefined && body.address_1 !== null && body.address_1 !== "")client_address.address_1 = body.address_1;

        return await clientModel.saveClientAddress(client_address);

    } catch (error:any) {
        console.error(`Failed to save client address: ${error.message}`);
        throw error;
    }

}

const saveFileLog = async(req:any,file:any,fields:any)=> {
    let file_log = {
        created_by:1,
        organization_id:req.user.organization_id || 1,
        original_file_name:file.originalFilename,
    } as any;
    return await clientModel.saveClientFileLog(file_log);
}
// --------------- update client details  -------------------------

const fetch_client_details_by_id = async(req:any)=> {
    try {
        const results = await  clientModel.fetch_client_details_by_id(req.query.client_id);
        return results
    } catch (error:any) {
        console.error(`Failed to fetch client details ${error.message}`);
        throw error;
    }

}

const updateClient = async (req: any, body: any) => {
    try {
        let client_info = {
            updated_by: req.user.updated_by || 0,
            updated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        } as any;

        // Update fields only if they have valid values
        if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "") client_info.client_code = body.client_code;
        if (body.client_name !== undefined && body.client_name !== null && body.client_name !== "") client_info.client_name = body.client_name;
        if (body.mobile !== undefined && body.mobile !== null && body.mobile !== "") client_info.mobile = body.mobile;
        if (body.email !== undefined && body.email !== null && body.email !== "") client_info.email = body.email;
        if (body.branch_code !== undefined && body.branch_code !== null && body.branch_code !== "") client_info.branch_code = body.branch_code;
        if (body.sub_broker_code !== undefined && body.sub_broker_code !== null && body.sub_broker_code !== "") client_info.sub_broker_code = body.sub_broker_code;
        if (body.dealer_code !== undefined && body.dealer_code !== null && body.dealer_code !== "") client_info.dealer_code = body.dealer_code;
        if (body.status !== undefined && body.status !== null && body.status !== "") client_info.status = body.status;
        if (body.is_auto_reply !== undefined && body.is_auto_reply !== null && body.is_auto_reply !== "") client_info.is_auto_reply = body.is_auto_reply;

        // Call model function to update client info in the database
        return await clientModel.updateClient(body.client_id,client_info);
    } catch (error: any) {
        console.error("Error updating client info:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const  updateClientProfile = async (req: any, body: any) => {
    try {
        let client_profile = {
            updated_by: req.user.updated_by || 0,
            updated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        } as any;

        // Update fields only if they have valid values
        if (body.pan_number !== undefined && body.pan_number !== null && body.pan_number !== "") client_profile.pan_number = body.pan_number;
        if (body.bank_name !== undefined && body.bank_name !== null && body.bank_name !== "") client_profile.bank_name = body.bank_name;
        if (body.bank_account_number !== undefined && body.bank_account_number !== null && body.bank_account_number !== "") client_profile.bank_account_number = body.bank_account_number;
        if (body.bank_ifsc_code !== undefined && body.bank_ifsc_code !== null && body.bank_ifsc_code !== "") client_profile.bank_ifsc_code = body.bank_ifsc_code;
        if (body.default_dp !== undefined && body.default_dp !== null && body.default_dp !== "") client_profile.default_dp = body.default_dp;
        if (body.date_of_birth !== undefined && body.date_of_birth !== null && body.date_of_birth !== "") client_profile.date_of_birth = body.date_of_birth;

        // Call model function to update client profile in the database
        return await clientModel.updateClientProfile(body.client_id,client_profile);
    } catch (error: any) {
        console.error("Error updating client profile:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const updateClientAddress = async (req: any, body: any) => {
    try {
        let client_address = {
            updated_by: req.user.updated_by || 0,
            updated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        } as any;

        // Update fields only if they have valid values
        if (body.address_1 !== undefined && body.address_1 !== null && body.address_1 !== "") client_address.address_1 = body.address_1;
        if (body.address_2 !== undefined && body.address_2 !== null && body.address_2 !== "") client_address.address_2 = body.address_2;
        if (body.city_name !== undefined && body.city_name !== null && body.city_name !== "") client_address.city = body.city_name;
        if (body.city_id !== undefined && body.city_id !== null && body.city_id !== "") client_address.city_id = body.city_id;
        if (body.pin_code !== undefined && body.pin_code !== null && body.pin_code !== "") client_address.pin_code = body.pin_code;

        // Call model function to update client address in the database
        return await clientModel.updateClientAddress(body.client_id,client_address);
    } catch (error: any) {
        console.error("Error updating client address:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const updateClientDetails  = async(req:any)=> {
    try {
        const [updateClientInfo,addressResult, profileResult] = await Promise.all([
            updateClient(req,req.body),
            updateClientAddress(req, req.body),
            updateClientProfile(req, req.body)
        ]);
        if (!updateClientInfo || !addressResult || !profileResult) {
            throw new Error('Error: One or more updates failed.');
        }
        return req.body;
    } catch (error) {
        console.error('Error updation client information :', error);
        throw new Error('Error updation client information');
    }
}

export default {
    fetch_all_clients_with_pagination: fetch_all_clients_with_pagination,
    fetch_all_clients:fetch_all_clients,
    import_clients: import_clients,
    save_client_info:save_client_info,
    fetch_client_details_by_id : fetch_client_details_by_id,
    updateClientDetails:updateClientDetails

}
