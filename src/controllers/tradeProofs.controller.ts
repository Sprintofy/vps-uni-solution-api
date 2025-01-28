'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import tradeProofsService from '../services/tradeProofs.service';
import readEmailService from '../services/emailRead.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('roleController.ts');


const fetch_all_clients_proofs: IController = async (req: any, res: any) => {
    try {
        let result = await tradeProofsService.fetch_all_clients_proofs(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_pre_trades_by_client_id: IController = async (req: any, res: any) => {
    try {
         let results = await tradeProofsService.fetch_trades_details_by_client_id(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
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
        let result = await tradeProofsService.fetch_all_clients_trades_logs(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
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
        const results = await tradeProofsService.download_all_pdf(req)
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_email: IController = async (req: any, res: any) => {
    try {
        const results = await tradeProofsService.download_all_email(req)
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_pdf_by_client: IController = async (req: any, res: any) => {
    try {
        let results = await tradeProofsService.download_all_pdf_by_client(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const download_all_email_by_client: IController = async (req: any, res: any) => {
    try {
        let results = await tradeProofsService.download_all_email_by_client(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const read_email: IController = async (req: any, res: any) => {
    try {
        let results = await readEmailService.read_email(req);
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

    fetch_all_clients_proofs: fetch_all_clients_proofs,
    fetch_pre_trades_by_client_id: fetch_pre_trades_by_client_id,
    fetch_all_clients_trades_logs: fetch_all_clients_trades_logs,

    download_all_pdf: download_all_pdf,
    download_all_email:download_all_email,
    download_all_pdf_by_client: download_all_pdf_by_client,
    download_all_email_by_client:download_all_email_by_client,

    read_email: read_email
}
