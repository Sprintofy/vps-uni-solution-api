'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import instructionOrderService from '../services/postTrade.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('roleController.ts');

const import_instruction_order: IController = async (req: any, res: any) => {
    try {
        let result = await instructionOrderService.import_instruction_order(req);
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
        let result = await instructionOrderService.fetch_all_clients_trades(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const trade_details: IController = async (req: any, res: any) => {
    try {
        //let result = await clientTradeService.fetch_all_clients_trades(req);
        let data={
            client_trade_id: 1,
            client_id: 2,
            trade_info:[ {
                client_trade_info_id: 11,
                client_id:12,
                client_trade_id:1,
                client_code:'assss',
                exchange_code: 'assss',
                buy_or_sell: 'assss',
                script_name:'assss',
                product: 'assss',
                price: 222,
                trigger_price:444,
                quantity: 7373,
                discounted_quantity:8383,
                order_type:'wsss',
                order_life:'sssss',
                gtd_value:'ssss',
                lots: 73
            }],
            customer: {
                client_name: 'pravin',
                email: 'sss',
                mobile: 'ssss',
                address: 'ssss'
            }
        }
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, data)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

export default {
    import_instruction_order: import_instruction_order,
    fetch_all_clients_trades: fetch_all_clients_trades,
    trade_details: trade_details
}
