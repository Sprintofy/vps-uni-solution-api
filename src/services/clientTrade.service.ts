'use strict';
import CONSTANTS from '../common/constants/constants';
import clientTradeModel from '../models/clinetTrade.model';
import clientModel from "../models/client.model";
import fileService from './common/file.service';
import emailNotificationServiceService from "./common/emailNotification.service";

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
                throw error
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

const processData = async (req: any, file: any, fields: any, data: any[]) => {
    try {

        const fileLogs = await saveTradeFileLog(req, file, fields);

        fields.file_log_id = fileLogs.file_log_id ;

        const mappedData = await mapAndTrimData(data,keyMapping);

        const status = await saveBulkClientTradeInfo(req, fields, mappedData);

        return status;

    } catch (error: any) {
        console.error("Error processing data:", error.message);
        throw error;
    }
};

const saveBulkClientTradeInfo = async(req:any,fields:any,data:any)=> {
    try {

        const uniqueClientId = [...new Set(data.map((item:any) => item.client_code))];

        const clients = await clientModel.fetchClientInfoByIds(uniqueClientId,fields.organization_id);

        const client_trades = clients.map((client:any) => {
            const trades = data.filter((trade:any) => trade.client_code === client.client_code);
            return {
                ...client,
                client_trades: trades, // Adding the trades array for this client
            };
        });

        const status_updated = data.map((trade:any) => {
            const trades = clients.filter((client:any) => trade.client_code === client.client_code);
            return {
                ...trade,
                status: trades.length ? 1 :0,
                comment: trades.length ? 'Record Inserted' :'Client Code not match.' // Adding the trades array for this client
            };
        });

        const not_match_record = status_updated.filter((trade:any) => trade.status == 0);

        // if (not_match_record.length){
        //      throw new Error('Some Trade not Match with Client Code');
        // }

        await saveTrades(req, fields, client_trades);

        return status_updated;

    } catch (error) {
        console.error('Error processing bulk  Trade:', error);
        throw new Error('Error processing bulk client Trade');
    }
}

const saveTrades = async(req:any,fields:any,data:any)=> {
    try {

        for (const client of data) {

            // save client trade info
            const client_trade_id = await saveClientTrade(req,fields,client) as any;

            client.client_trade_id = client_trade_id.insertId;

            // save the client pre-trade information
            //await saveClientTradeBulkInfo(req,client,client.client_trades);

            // send the client pre-trade notification
            //emailNotificationServiceService.sendPreTradeEmailToClientOrganizationWise(fields.organization_id,client)
        }

    } catch (error) {
        console.error('Error processing bulk clients:', error);
        throw new Error('Error processing bulk client information');
    }
}

const saveClientTradeBulkInfo = async(req:any,client:any,trades:any)=> {
    for (const trade of trades) {

         trade.client_trade_id = client.client_trade_id;

         await saveClientTradeInfo(req,client,trade) as any;
    }
}


/*************** MYSQL CURD Operation *************/

const saveClientTrade = async(req:any,fields:any,body:any)=> {

    let client_trade = {
        organization_id: body.organization_id,
        client_id: body.client_id,
        client_code: body.client_code,
        file_log_id: fields.file_log_id,

        //is_email_sent: body.is_email_sent !== undefined && body.is_email_sent !== null ? body.is_email_sent : 0,
        //is_email_recieved: body.is_email_recieved !== undefined && body.is_email_recieved !== null ? body.is_email_recieved : 0,
        //email_proof: body.email_proof !== undefined && body.email_proof !== null && body.email_proof !== "" ? body.email_proof : null,
        //status: body.status !== undefined && body.status !== null ? body.status : 1,
        //created_by: req.user.user_id !== undefined && req.user.user_id  !== null ? req.user.user_id  : 0,
        //updated_by: req.user.user_id  !== undefined &&req.user.user_id  !== null ? req.user.user_id  : 0
    };

    return await clientTradeModel.saveClientTrade(client_trade);
}

const saveClientTradeInfo = async(req:any,fields:any,body:any)=> {
    const client_trade_info = {
        organization_id:fields.organization_id,
        client_trade_id:fields.client_trade_id,
        client_id:fields.client_id,
    } as any;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== "") client_trade_info.client_code = body.client_code;
    if (body.exchange_code !== undefined && body.exchange_code !== null && body.exchange_code !== "") client_trade_info.exchange_code = body.exchange_code;
    if (body.buy_or_sell !== undefined && body.buy_or_sell !== null && body.buy_or_sell !== "")client_trade_info.buy_or_sell = body.buy_or_sell;
    if (body.product !== undefined && body.product !== null && body.product !== "")client_trade_info.product = body.product;
    if (body.script_name !== undefined && body.script_name !== null && body.script_name !== "") client_trade_info.script_name = body.script_name;
    if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "")client_trade_info.quantity = body.quantity;
    if (body.lots !== undefined && body.lots !== null && body.lots !== "") client_trade_info.lots = body.lots;
    if (body.order_type !== undefined && body.order_type !== null && body.order_type !== "")client_trade_info.order_type = body.order_type;
    if (body.price !== undefined && body.price !== null && body.price !== "") client_trade_info.price = body.price;
    if (body.discounted_quantity !== undefined && body.discounted_quantity !== null && body.discounted_quantity !== "")client_trade_info.discounted_quantity = body.discounted_quantity;
    if (body.trigger_price !== undefined && body.trigger_price !== null && body.trigger_price !== "")client_trade_info.trigger_price = body.trigger_price;
    if (body.order_life !== undefined && body.order_life !== null && body.order_life !== "")client_trade_info.order_life = body.order_life;
    if (body.gtd_value !== undefined && body.gtd_value !== null && body.gtd_value !== "")client_trade_info.gtd_value = body.gtd_value;
    return await clientTradeModel.saveClientTradeInfo(client_trade_info);
}

const saveTradeFileLog = async(req:any,file:any,fields:any)=> {
    let file_log = {
        created_by:1,
        organization_id:1,
        original_file_name:file.originalFilename,
    } as any;
    const results = await clientTradeModel.saveClientTradeFileLog(file_log);
    return {file_log_id:results.insertId}
}

const updateTradeFileLog = async(req:any,file:any,fields:any)=> {
    let file_log = {
        created_by:1,
        organization_id:1,
        original_file_name:file.originalFilename,
    } as any;
    const results = await clientTradeModel.saveClientTradeFileLog(file_log);
    return {file_log_id:results.insertId}
}

export default {
    import_trades: import_trades,
    fetch_all_clients_trades:fetch_all_clients_trades
}
