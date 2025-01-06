'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import clientTradeService from '../services/clientTrade.service';
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


export default {
    import_trades: import_trades,
    fetch_all_clients_trades: fetch_all_clients_trades
}
