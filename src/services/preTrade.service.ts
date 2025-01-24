'use strict';
import CONSTANTS from '../common/constants/constants';
import clientTradeModel from '../models/preTrade.model';
import clientModel from "../models/client.model";
import fileService from './common/file.service';
import emailNotificationServiceService from "./common/notification.service";
import path from "path";
import moment from "moment";
import fs from "fs";
import preTradeModel from '../models/preTrade.model';
import axios from 'axios';
import archiver from 'archiver';
const awsS3BucketService = require("./utilities/awsS3Bucket.service");

const fetch_all_clients_trades = async (req: any) => {
    try {
        const clients = await clientTradeModel.fetchAllClientsTrades(1,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await clientTradeModel.fetchAllClientsTradesCount(1,req.body.query || "");
        return {
            data:clients,
            total:total[0].total
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
}
const fetch_all_clients_trades_logs = async (req: any) => {
    try {
        const clients = await clientTradeModel.fetch_all_clients_trades_logs(1,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await clientTradeModel.fetch_all_clients_trades_logs_count(1,req.body.query || "");
        return {
            data:clients,
            total:total[0].total
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
}

const import_trades = async (req: any) => {
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
                // Parse the file based on its extension.

                if (file.originalFilename.endsWith(".csv")) {
                    parsedData = await fileService.parseCSVFile(file.filepath);
                } else if (file.originalFilename.endsWith(".xlsx") || file.originalFilename.endsWith(".xls")) {
                    parsedData = await fileService.parseExcelFile(file.filepath);
                } else {
                    console.warn("Unsupported file type:", file.originalFilename);
                    continue; // Skip unsupported files
                }

                // Process parsed data...
                await process_pre_trade_data(req, file, fields, parsedData);

                // Delete File Path
                await fileService.deleteFile(file.filepath);

            } catch (error: any) {
                console.error(`Error processing file ${file.originalFilename}:`, error.message);
                await fileService.deleteFile(file.filepath);
                throw error;
            }
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

// Mapping object that converts the keys
const keyMapping = {
    ExchangeCode:'exchange_code',
    BuyOrSell: 'buy_or_sell',
    Product: 'product',
    ScripName: 'script_name',
    Qty: 'quantity',
    Lot: 'lots',
    OrderType: 'order_type',
    Price: 'price',
    ClientCode: 'client_code',
    DiscQty: 'discounted_quantity',
    TriggerPrice: 'trigger_price',
    OrderLife: 'order_life',
    GTD: 'gtd_value'

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

const process_pre_trade_data = async (req: any, file: any, fields: any, data: any[]) => {
    try {

        const fileLogs = await save_trade_file_log(req,{original_file_name:file.original_file_name});

        fields.pre_tades_file_id = fileLogs.insertId ;

        const mappedData = await mapAndTrimData(data,keyMapping);

        const status = await save_bulk_pre_trade_info(req, fields, mappedData);

        return status;

    } catch (error: any) {
        console.error("Error processing data:", error.message);
        throw error;
    }
};

const save_bulk_pre_trade_info = async(req:any,fields:any,data:any)=> {
    try {

        const check_existing_email = true;

        const pre_trades_info = await add_client_info_in_pre_trade(req,fields,data);

        // Save pre-trade info and update trade objects with pre_trade_info_id
        const preTradeInfoPromises = pre_trades_info.trade_info.map(async (trade: any) => {
            trade.pre_tades_file_id = fields.pre_tades_file_id;
            const results = await save_pre_trade_info(req, trade);
            return { ...trade, pre_trade_info_id: results.insertId };
        });

        const preTradeInfo = await Promise.all(preTradeInfoPromises);

        // const not_match_record = status_updated.filter((trade:any) => trade.status == 0);

        // if (not_match_record.length){
        //      throw new Error('Some Trade not Match with Client Code');
        // }


        const batchResults = pre_trades_info.client_wise_trades.map(async (client: any) => {
            console.log(client)
            return save_bulk_trades_by_client(req,client);
        });

        const clientPreTrade = await Promise.all(batchResults);

        return true;

    } catch (error) {
        console.error('Error processing bulk  Trade:', error);
        throw new Error('Error processing bulk client Trade');
    }
}

const add_client_info_in_pre_trade = async(req:any,fields:any,data:any)=> {
    try {

        const uniqueClientCodes = [...new Set(data.map((item:any) => item.client_code))];

        //console.log("uniqueClientCodes",uniqueClientCodes);

        const clients = await clientModel.fetchClientInfoByIds(uniqueClientCodes,fields.organization_id);

        //console.log("client_info length",clients.length)

        const trade_info = data.map((order:any) => {
            const client = clients.find((client:any) => client.client_code === order.client_code);
            if (client) {
                return {
                    ...order,
                    client_info:client,
                    client_id:client.client_id,
                    client_name: client.client_name,
                    email: client.email,
                    mobile: client.mobile,
                    organization_id:client.organization_id,
                    status:1,
                    comment:'Record Saved.'
                };
            } else {
                return {
                    ...order,
                    status:0,
                    comment:'Client Code is not Found.'
                };
            }
        });

        const client_wise_trades = clients.map((client:any) => {
            const trades = trade_info.filter((trade:any) => trade.client_code === client.client_code);
            return {
                ...client,
                pre_tades_file_id:fields.pre_tades_file_id,
                trade_info: trades,
                status: trades.length ? 1 :0,
                comment: trades.length ? 'Record Saved.' :'Client Code is not Found.' // Adding the trades array for this client// Adding the trades array for this client
            };
        });

        return {
            trade_info: trade_info,
            client_info: clients,
            client_wise_trades:client_wise_trades
        }

    } catch (error) {
        console.error('Error processing bulk  Trade:', error);
        throw new Error('Error processing bulk client Trade');
    }
}

const check_validation_pre_trade_client = async(req:any,client:any)=> {
    try {
        const is_send_unique_email = true;

        const comparisonKeys = [
            { key: "exchange_code" },
            { key: "buy_or_sell" },
            { key: "product" },
            { key: "script_name" },
            { key: "quantity", normalize: (value: any) => parseInt(value, 10) }, // Convert to integer
            { key: "price", normalize: (value: any) => parseFloat(value).toFixed(2) }, // Normalize to float with 2 decimals
            { key: "trigger_price", normalize: (value: any) => parseFloat(value).toFixed(2) } // Normalize to float with 2 decimals
        ];

        if(is_send_unique_email) {

        const existing_pre_trade = await clientTradeModel.fetch_existing_pre_trade_client_ids([client.client_id]);

        const matchingArray = [] as any;
        const nonMatchingArray = [] as any;
        client.trade_info.forEach((trade:any) => {
            // console.log("trade--->",trade)
            const isMatch = existing_pre_trade.some((existingTrade:any) => {
                // console.log("existingTrade--->",existingTrade)
                return comparisonKeys.every(({ key, normalize }) => {
                    const tradeValue = normalize ? normalize(trade[key]) : trade[key];
                    const existingValue = normalize ? normalize(existingTrade[key]) : existingTrade[key];
                    return tradeValue === existingValue;
                });
            });
            if (isMatch) {
                matchingArray.push(trade);
            } else {
                nonMatchingArray.push(trade);
            }
        });

        client.unique_trade_info = nonMatchingArray;
        client.duplicate_trade_info = matchingArray;

        } else {
            client.unique_trade_info = client.trade_info;
            client.duplicate_trade_info =  [];
        }
        return client;
    } catch (error:any) {
        console.error('Error occurred in validation trade info:', error);
        throw new Error('Error occurred in validation trade info');
    }
}

const save_bulk_trades_by_client = async(req:any,client:any)=> {
    try {

        const client_info = await check_validation_pre_trade_client(req,client);


        if(client_info.unique_trade_info.length) {

            // send email to client pre-trade
            const email_response = await emailNotificationServiceService.sendPreTradeEmailToClientOrganizationWise(client_info.organization_id,client_info)

            // pdf creation pre-trade
            const pdf_url = await emailNotificationServiceService.generatePreTradeClientWise(client_info.organization_id,client_info)

            // Save pre-trade proofs and get the proof ID
            const emailProof = await save_pre_trade_proofs(req,{
                is_email_sent: 1,
                email_response:JSON.stringify(email_response),
                pdf_url:pdf_url,
                client_id:client_info.client_id,
                client_code:client_info.client_code
            });

            const preProofId = emailProof.insertId;

            // Save updated trades with pre_proof_id
            const saveTradePromises = client_info.unique_trade_info.map((trade: any) => {
                trade.pre_proof_id = preProofId;
                return save_pre_trade(req, trade);
            });

            await Promise.all(saveTradePromises);
        }

        return true;

    } catch (error) {
        console.error('Error occurred in save_bulk_trades_by_client  :', error);
        throw new Error('Error occurred in save client pre trade information');
    }
}

const save_trades_by_client = async(req:any)=> {
    try {

        const client_info = await  clientModel.fetch_client_info_by_id(req.body.client_id) as any;

        if(!client_info) throw new Error('Client info not found');

        req.body.client_name = client_info[0].client_name;
        req.body.email = client_info[0].email;
        req.body.client_code = client_info[0].client_code;

        // Save pre-trade info and update trade objects with pre_trade_info_id
        const preTradeInfoPromises = req.body.unique_trade_info.map(async (trade: any) => {
            const results = await save_pre_trade_info(req, trade);
            return { ...trade, pre_trade_info_id: results.insertId };
        });

        const updatedTrades = await Promise.all(preTradeInfoPromises);

        // send email to client pre trade
        const email_response = await emailNotificationServiceService.sendPreTradeEmailToClientOrganizationWise(1,req.body)

        req.body.is_email_sent = 1;
        req.body.email_response = JSON.stringify(email_response);

        // pdf creation pre trade
        req.body.pdf_url = await emailNotificationServiceService.generatePreTradeClientWise(1,req.body)


        // Save pre-trade proofs and get the proof ID
        const emailProof = await save_pre_trade_proofs(req, req.body);

        const preProofId = emailProof.insertId;

        // Save updated trades with pre_proof_id
        const saveTradePromises = updatedTrades.map((trade: any) => {
            trade.pre_proof_id = preProofId;
            return save_pre_trade(req, trade);
        });

        await Promise.all(saveTradePromises);

        return true;
    } catch (error) {
        console.error('Error processing bulk clients:', error);
        throw new Error('Error processing bulk client information');
    }
}

const fetch_trades_details_by_client_id = async(req:any)=> {
    try {
         let response = {} as any;

        const client_info = await clientModel.fetch_client_info_by_id(req.query.client_id);

        if(!client_info.length) throw new Error("Client info not found");
        response.client_id = client_info[0].client_id;
        response.customer = client_info[0];

        const trades = await clientTradeModel.fetch_trade_by_client(req.query.client_id)
        response.trade_info = trades;


        const trades_proofs = await clientTradeModel.fetch_trade_proof_by_client_id(req.query.client_id)
        response.trade_proof = trades_proofs;


                // Add script_name array to each trade proof by matching pre_proof_id
                response.trade_proof = trades_proofs.map((proof: any) => {
                    const relatedTrades = trades.filter((trade: any) => trade.pre_proof_id === proof.pre_trade_proof_id);
                    return {
                        ...proof,
                        script_names: relatedTrades.map((trade: any) => trade.script_name),
                    };
                });

        return response


    } catch (error:any) {
        throw error
    }
}

const download_all_email = async (req:any) => {
    try {
        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const downloadedFiles: string[] = [];

        // Download each file from S3
        // for (const key of keys) {
        //     const localFilePath = path.join(uploadDir, path.basename(key));
        //     await awsS3BucketService.downloadFileFromS3( key, localFilePath);
        //     downloadedFiles.push(localFilePath);
        // }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        // Upload the zip file back to S3
        const uploadedZipKey = `zipped/${file_name}`;
        const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

// const download_all_pdf = async (req:any) => {
//     try {
//         const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
//         const uploadDir = path.join(__dirname, '/uploads');
//         const zipFilePath = path.join(uploadDir, file_name);

//         // Create temp directory if it doesn't exist
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir, { recursive: true });
//         }

//         // const keys = await clientTradeModel.fetch_all_trade_proof_urls()

//         console.log("keys from db");

//         const downloadedFiles: string[] = [];

//         const keys :any[]= []
//         keys.push(
//             {
//             pdf_url:'https://uni-solution-api.sprintofy.com/proofs/organization_1/PRB3134_trade_info_22_01_2025_17-07-15.pdf',
//             pre_trade_proof_id : 1,
//             client_code : 'PRB3134',
//             created_date : '2024-12-12',
//         })

//         console.log("keys from db 2");

//         // Download each file from S3
//         // for (const key of keys) {

//         //     const localFilePath = path.join(uploadDir, path.basename(`${key.pre_trade_proof_id}_${key.client_code}_${key.created_date}`));
//         //     console.log("keys from db 2.1",localFilePath);

//         //     await awsS3BucketService.downloadFileFromS3( key.pdf_url, localFilePath);

//         //     downloadedFiles.push(localFilePath);
//         // }



//         for (const key of keys) {
//             const fileName = `${key.pre_trade_proof_id}_${key.client_code}_${key.created_date}.pdf`;
//             const localFilePath = path.join(uploadDir, fileName);

//             const response:any = await axios({
//                 url: key.pdf_url,
//                 method: 'GET',
//                 responseType: 'stream',
//             });

//             const writer = fs.createWriteStream(localFilePath);
//             response.data.pipe(writer);

//             await new Promise((resolve, reject) => {
//                 writer.on('finish', resolve);
//                 writer.on('error', reject);
//             });

//             downloadedFiles.push(localFilePath);
//         }

//         console.log("keys from db 3");

//         // Create a zip file
//         await fileService.createZipFile(downloadedFiles, zipFilePath);

//         console.log("keys from db 4");

//         // Upload the zip file back to S3
//         // const uploadedZipKey = `zipped/${file_name}`;
//         // const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

//         // Cleanup local files
//         // downloadedFiles.forEach((file) => fs.unlinkSync(file));
//         // fs.unlinkSync(zipFilePath);

//         return
//         // zipFileUrl;
//     } catch (error: any) {
//         console.error(`Error processing files: ${error.message}`);
//         throw error;
//     }
// };



const download_all_pdf = async (req: any) => {
    try {
        const file_name = `trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temporary reports directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const keys = await clientTradeModel.fetch_all_trade_proof_urls()

        // const keys: any[] = [
        //     {
        //         pdf_url: 'https://uni-solution-api.sprintofy.com/proofs/organization_1/PRB3134_trade_info_22_01_2025_17-07-15.pdf',
        //         pre_trade_proof_id: 1,
        //         client_code: 'PRB3134',
        //         created_date: '2024-12-12',
        //     },
        // ];

        const downloadedFiles: string[] = [];

        // Download each file
        for (const key of keys) {
            const fileName = `${key.pre_trade_proof_id}_${key.client_code}_${key.created_date}.pdf`;
            const localFilePath = path.join(uploadDir, fileName);

            const response :any = await axios({
                url: key.pdf_url,
                method: 'GET',
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(localFilePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            downloadedFiles.push(localFilePath);
        }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        const fileContent = fs.createReadStream(zipFilePath);


        // Upload zip file to S3
        const zipFileUrl = await awsS3BucketService.uploadFile(fileContent, 'zipped', file_name);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl.Location;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};





const download_zip_file = async (req:any) => {
    try {
        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '../../public/reports');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const downloadedFiles: string[] = [];

        // Download each file from S3
        // for (const key of keys) {
        //     const localFilePath = path.join(uploadDir, path.basename(key));
        //     await awsS3BucketService.downloadFileFromS3( key, localFilePath);
        //     downloadedFiles.push(localFilePath);
        // }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        // Upload the zip file back to S3
        const uploadedZipKey = `zipped/${file_name}`;
        const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

const download_all_pdf_by_client = async (req:any) => {
    try {

        console.log("in file download", req.query)
        if(!req.query.client_id){
            throw new Error(`Client Id is required`)
        }


        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const keys = await clientTradeModel.fetch_all_trade_proof_urls_by_client_id(req.query.client_id)

        // const keys: any[] = [
        //     {
        //         pdf_url: 'https://uni-solution-api.sprintofy.com/proofs/organization_1/PRB3134_trade_info_22_01_2025_17-07-15.pdf',
        //         pre_trade_proof_id: 1,
        //         client_code: 'PRB3134',
        //         created_date: '2024-12-12',
        //     },
        // ];

        if(keys.length === 0){
            throw new Error(`No files found for client id: ${req.query.client_id}`)
        }

        console.log("url",keys)

        const downloadedFiles: string[] = [];

        // Download each file
        for (const key of keys) {
            const fileName = `${key.pre_trade_proof_id}_${key.client_code}_${key.created_date}.pdf`;
            const localFilePath = path.join(uploadDir, fileName);

            const response :any = await axios({
                url: key.pdf_url,
                method: 'GET',
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(localFilePath);
            response.data.pipe(writer);



            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            console.log("url 5 ")


            downloadedFiles.push(localFilePath);
        }
        console.log("url 6",keys)


        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        console.log("url 7")

        const fileContent = fs.createReadStream(zipFilePath);


        // Upload zip file to S3
        const zipFileUrl = await awsS3BucketService.uploadFile(fileContent, 'zipped', file_name);

        console.log("url 8",zipFileUrl)

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        console.log("url 9",zipFileUrl)

        return zipFileUrl.Location;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

const download_all_email_by_client = async (req:any) => {
    try {
        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '../../../public/reports');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const downloadedFiles: string[] = [];

        // Download each file from S3
        // for (const key of keys) {
        //     const localFilePath = path.join(uploadDir, path.basename(key));
        //     await awsS3BucketService.downloadFileFromS3( key, localFilePath);
        //     downloadedFiles.push(localFilePath);
        // }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        // Upload the zip file back to S3
        const uploadedZipKey = `zipped/${file_name}`;
        const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};



/*************** MYSQL CURD Operation *************/

// pre_trade
const save_pre_trade = async(req:any,body:any)=> {

    const data = {
        organization_id:req.user && req.user.organization_id ? req.user.organization_id : 1,
        client_id:body.client_id,
        created_by:req.user && req.user.user_id ? req.user.user_id : 1,
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.pre_trade_info_id !== undefined && body.pre_trade_info_id !== null && body.pre_trade_info_id !== "") data.pre_trade_info_id = body.pre_trade_info_id;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "") data.client_code = body.client_code;
    if (body.exchange_code !== undefined && body.exchange_code !== null && body.exchange_code !== "") data.exchange_code = body.exchange_code;
    if (body.buy_or_sell !== undefined && body.buy_or_sell !== null && body.buy_or_sell !== "")data.buy_or_sell = body.buy_or_sell;
    if (body.product !== undefined && body.product !== null && body.product !== "")data.product = body.product;
    if (body.script_name !== undefined && body.script_name !== null && body.script_name !== "") data.script_name = body.script_name;
    if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "")data.quantity = body.quantity;
    if (body.lots !== undefined && body.lots !== null && body.lots !== "") data.lots = body.lots;
    if (body.order_type !== undefined && body.order_type !== null && body.order_type !== "")data.order_type = body.order_type;
    if (body.price !== undefined && body.price !== null && body.price !== "") data.price = body.price;
    if (body.discounted_quantity !== undefined && body.discounted_quantity !== null && body.discounted_quantity !== "")data.discounted_quantity = body.discounted_quantity;
    if (body.trigger_price !== undefined && body.trigger_price !== null && body.trigger_price !== "")data.trigger_price = body.trigger_price;
    if (body.order_life !== undefined && body.order_life !== null && body.order_life !== "")data.order_life = body.order_life;
    if (body.gtd_value !== undefined && body.gtd_value !== null && body.gtd_value !== "")data.gtd_value = body.gtd_value;
    if (body.pre_proof_id !== undefined && body.pre_proof_id !== null && body.pre_proof_id !== "")data.pre_proof_id = body.pre_proof_id;
    if (body.is_email_sent !== undefined && body.is_email_sent !== null && body.is_email_sent !== "")data.is_email_sent = body.is_email_sent;
    if (body.is_email_received !== undefined && body.is_email_received !== null && body.is_email_received !== "")data.is_email_received = body.is_email_received;
    if (body.email_url !== undefined && body.email_url !== null && body.email_url !== "")data.email_url = body.email_url;
    if (body.pdf_url !== undefined && body.pdf_url !== null && body.pdf_url !== "")data.pdf_url = body.pdf_url;

    const results = await clientTradeModel.save_pre_trade(data)

    return results;

}

const update_pre_trade = async(req:any,body:any)=> {
    let data = {
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.organization_id !== undefined && body.organization_id !== null && body.organization_id !== "") data.organization_id = body.organization_id;
    if (body.client_id !== undefined && body.client_id !== null && body.client_id !== "") data.client_id = body.client_id;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "") data.client_code = body.client_code;
    if (body.exchange_code !== undefined && body.exchange_code !== null && body.exchange_code !== "") data.exchange_code = body.exchange_code;
    if (body.buy_or_sell !== undefined && body.buy_or_sell !== null && body.buy_or_sell !== "")data.buy_or_sell = body.buy_or_sell;
    if (body.product !== undefined && body.product !== null && body.product !== "")data.product = body.product;
    if (body.script_name !== undefined && body.script_name !== null && body.script_name !== "") data.script_name = body.script_name;
    if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "")data.quantity = body.quantity;
    if (body.lots !== undefined && body.lots !== null && body.lots !== "") data.lots = body.lots;
    if (body.order_type !== undefined && body.order_type !== null && body.order_type !== "")data.order_type = body.order_type;
    if (body.price !== undefined && body.price !== null && body.price !== "") data.price = body.price;
    if (body.discounted_quantity !== undefined && body.discounted_quantity !== null && body.discounted_quantity !== "")data.discounted_quantity = body.discounted_quantity;
    if (body.trigger_price !== undefined && body.trigger_price !== null && body.trigger_price !== "")data.trigger_price = body.trigger_price;
    if (body.order_life !== undefined && body.order_life !== null && body.order_life !== "")data.order_life = body.order_life;
    if (body.gtd_value !== undefined && body.gtd_value !== null && body.gtd_value !== "")data.gtd_value = body.gtd_value;

    if (body.pre_proof_id !== undefined && body.pre_proof_id !== null && body.pre_proof_id !== "")data.pre_proof_id = body.pre_proof_id;
    if (body.is_email_sent !== undefined && body.is_email_sent !== null && body.is_email_sent !== "")data.is_email_sent = body.is_email_sent;
    if (body.is_email_received !== undefined && body.is_email_received !== null && body.is_email_received !== "")data.is_email_received = body.is_email_received;
    if (body.email_url !== undefined && body.email_url !== null && body.email_url !== "")data.email_url = body.email_url;
    if (body.pdf_url !== undefined && body.pdf_url !== null && body.pdf_url !== "")data.pdf_url = body.pdf_url;

    const results = await clientTradeModel.update_pre_trade_proofs(data,body.pre_tades_proof_id);
    return results;

}

// pre_trade info
const save_pre_trade_info = async(req:any,body:any)=> {
    const data = {
        organization_id:req.user && req.user.organization_id ? req.user.organization_id : 1,
        pre_tades_file_id: body.pre_tades_file_id || 0,
        client_id:body.client_id,
        created_by:req.user && req.user.user_id ? req.user.user_id : 1,
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "") data.client_code = body.client_code;
    if (body.exchange_code !== undefined && body.exchange_code !== null && body.exchange_code !== "") data.exchange_code = body.exchange_code;
    if (body.buy_or_sell !== undefined && body.buy_or_sell !== null && body.buy_or_sell !== "")data.buy_or_sell = body.buy_or_sell;
    if (body.product !== undefined && body.product !== null && body.product !== "")data.product = body.product;
    if (body.script_name !== undefined && body.script_name !== null && body.script_name !== "") data.script_name = body.script_name;
    if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "")data.quantity = body.quantity;
    if (body.lots !== undefined && body.lots !== null && body.lots !== "") data.lots = body.lots;
    if (body.order_type !== undefined && body.order_type !== null && body.order_type !== "")data.order_type = body.order_type;
    if (body.price !== undefined && body.price !== null && body.price !== "") data.price = body.price;
    if (body.discounted_quantity !== undefined && body.discounted_quantity !== null && body.discounted_quantity !== "")data.discounted_quantity = body.discounted_quantity;
    if (body.trigger_price !== undefined && body.trigger_price !== null && body.trigger_price !== "")data.trigger_price = body.trigger_price;
    if (body.order_life !== undefined && body.order_life !== null && body.order_life !== "")data.order_life = body.order_life;
    if (body.gtd_value !== undefined && body.gtd_value !== null && body.gtd_value !== "")data.gtd_value = body.gtd_value;

    const results = await clientTradeModel.save_trade_info(data)
    return results;

}

const update_pre_trade_info = async(req:any,body:any)=> {
    let data = {
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "") data.client_code = body.client_code;
    if (body.exchange_code !== undefined && body.exchange_code !== null && body.exchange_code !== "") data.exchange_code = body.exchange_code;
    if (body.buy_or_sell !== undefined && body.buy_or_sell !== null && body.buy_or_sell !== "")data.buy_or_sell = body.buy_or_sell;
    if (body.product !== undefined && body.product !== null && body.product !== "")data.product = body.product;
    if (body.script_name !== undefined && body.script_name !== null && body.script_name !== "") data.script_name = body.script_name;
    if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "")data.quantity = body.quantity;
    if (body.lots !== undefined && body.lots !== null && body.lots !== "") data.lots = body.lots;
    if (body.order_type !== undefined && body.order_type !== null && body.order_type !== "")data.order_type = body.order_type;
    if (body.price !== undefined && body.price !== null && body.price !== "") data.price = body.price;
    if (body.discounted_quantity !== undefined && body.discounted_quantity !== null && body.discounted_quantity !== "")data.discounted_quantity = body.discounted_quantity;
    if (body.trigger_price !== undefined && body.trigger_price !== null && body.trigger_price !== "")data.trigger_price = body.trigger_price;
    if (body.order_life !== undefined && body.order_life !== null && body.order_life !== "")data.order_life = body.order_life;
    if (body.gtd_value !== undefined && body.gtd_value !== null && body.gtd_value !== "")data.gtd_value = body.gtd_value;
    if (body.status !== undefined && body.status !== null && body.status !== "")data.status = body.status;

    const results = await clientTradeModel.update_pre_trade_proofs(data,body.pre_tades_proof_id);
    return results;

}

// pre_trade_proofs
const save_pre_trade_proofs = async(req:any,body:any)=> {
    let data = {
        organization_id:req.user && req.user.organization_id ? req.user.organization_id : 1,
        created_by:req.user && req.user.user_id ? req.user.user_id : 1,
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.pre_trade_id !== undefined && body.pre_trade_id !== null && body.pre_trade_id !== '') data.pre_trade_id = body.pre_trade_id;
    if (body.client_id !== undefined && body.client_id !== null && body.client_id !== '') data.client_id = body.client_id;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== '') data.client_code = body.client_code;
    if (body.organization_id !== undefined && body.organization_id !== null && body.organization_id !== '') data.organization_id = body.organization_id;
    if (body.email_response !== undefined && body.email_response !== null && body.email_response !== '') data.email_response = body.email_response;
    if (body.is_email_sent !== undefined && body.is_email_sent !== null && body.is_email_sent !== '') data.is_email_sent = body.is_email_sent;
    if (body.is_email_received !== undefined && body.is_email_received !== null && body.is_email_received !== '') data.is_email_received = body.is_email_received;
    if (body.email_url !== undefined && body.email_url !== null && body.email_url !== '') data.email_url = body.email_url;
    if (body.email_proof !== undefined && body.email_proof !== null && body.email_proof !== '') data.email_proof = body.email_proof;
    if (body.pdf_url !== undefined && body.pdf_url !== null && body.pdf_url !== '') data.pdf_url = body.pdf_url;

    const results = await clientTradeModel.save_pre_trade_proofs(data);
    return results;

}

const update_pre_trade_proofs = async(req:any,body:any)=> {
    let data = {
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.pre_trade_id !== undefined && body.pre_trade_id !== null && body.pre_trade_id !== '') data.pre_trade_id = body.pre_trade_id;
    if (body.client_id !== undefined && body.client_id !== null && body.client_id !== '') data.client_id = body.client_id;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== '') data.client_code = body.client_code;
    if (body.organization_id !== undefined && body.organization_id !== null && body.organization_id !== '') data.organization_id = body.organization_id;
    if (body.email_id !== undefined && body.email_id !== null && body.email_id !== '') data.email_id = body.email_id;
    if (body.is_email_sent !== undefined && body.is_email_sent !== null && body.is_email_sent !== '') data.is_email_sent = body.is_email_sent;
    if (body.is_email_received !== undefined && body.is_email_received !== null && body.is_email_received !== '') data.is_email_received = body.is_email_received;
    if (body.email_url !== undefined && body.email_url !== null && body.email_url !== '') data.email_url = body.email_url;
    if (body.email_proof !== undefined && body.email_proof !== null && body.email_proof !== '') data.email_proof = body.email_proof;
    if (body.pdf_url !== undefined && body.pdf_url !== null && body.pdf_url !== '') data.pdf_url = body.pdf_url;
    if (body.status !== undefined && body.status !== null && body.status !== '') data.status = body.status;

    const results = await clientTradeModel.update_pre_trade_proofs(data,body.pre_tades_proof_id);
    return results;

}

// file logs
const save_trade_file_log = async(req:any,body:any)=> {
    let file_log = {
        created_by: req.user && req.user.user_id ? req.user.user_id : 1,
        updated_by: req.user && req.user.user_id ? req.user.user_id : 1,
        organization_id: req.user && req.user.organization_id ? req.user.organization_id : 1,
    } as any;

    if(body.original_file_name !== undefined && body.original_file_name !==  null && body.original_file_name !== "" ) file_log.original_file_name = body.original_file_name;
    if(body.output_file_name !== undefined && body.output_file_name !==  null && body.output_file_name !== "" ) file_log.output_file_name = body.output_file_name;

    const results = await clientTradeModel.save_trade_file_log(file_log);
    return results;
}

const update_pre_trade_file_log = async(req:any,body:any)=> {

    let data = {
        updated_by: req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if(body.original_file_name !== undefined && body.original_file_name !==  null && body.original_file_name !== "" ) data.original_file_name = body.original_file_name;
    if(body.output_file_name !== undefined && body.output_file_name !==  null && body.output_file_name !== "" ) data.output_file_name = body.output_file_name;
    if (body.status !== undefined && body.status !== null && body.status !== '') data.status = body.status;

    const results = await clientTradeModel.update_pre_trade_file_log(data,body.pre_tades_file_id);

    return results;
}

export default {
    import_trades: import_trades,
    save_trades_by_client:save_trades_by_client,
    fetch_all_clients_trades:fetch_all_clients_trades,
    fetch_trades_details_by_client_id:fetch_trades_details_by_client_id,
    fetch_all_clients_trades_logs:fetch_all_clients_trades_logs,
    download_all_email: download_all_email,
    download_all_pdf: download_all_pdf,
    download_all_pdf_by_client: download_all_pdf_by_client,
    download_all_email_by_client: download_all_email_by_client
}
