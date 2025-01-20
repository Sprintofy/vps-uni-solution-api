'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import clientTradeService from '../services/preTrade.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('roleController.ts');

const import_trades: IController = async (req: any, res: any) => {
    try {
        let result = await clientTradeService.import_trades(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_all_clients_trades: IController = async (req: any, res: any) => {
    try {
        let result = await clientTradeService.fetch_all_clients_trades(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}
const fetch_all_clients_trades_logs: IController = async (req: any, res: any) => {
    try {
        let result = await clientTradeService.fetch_all_clients_trades_logs(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_trades_details_by_client_id: IController = async (req: any, res: any) => {
    try {
         let results = await clientTradeService.fetch_trades_details_by_client_id(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const save_trades_by_client: IController = async (req: any, res: any) => {
    try {
         let results = await clientTradeService.save_trades_by_client(req);
         apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_pdf: IController = async (req: any, res: any) => {
    try {
         const results = {
             file_url:"https://api.humpyfarms.com/images/city/1710439273.png"
         }
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

export default {
    import_trades: import_trades,
    fetch_all_clients_trades: fetch_all_clients_trades,
    fetch_trades_details_by_client_id: fetch_trades_details_by_client_id,
    save_trades_by_client:save_trades_by_client,
    download_all_pdf:download_all_pdf,
    fetch_all_clients_trades_logs:fetch_all_clients_trades_logs
}
