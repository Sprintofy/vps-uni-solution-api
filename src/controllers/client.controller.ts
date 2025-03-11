'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import clientService from '../services/client.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('roleController.ts');

const import_clients: IController = async (req: any, res: any) => {
    try {
        let result = await clientService.import_clients(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_all_clients_with_pagination: IController = async (req: any, res: any) => {
    try {
        let results = await clientService.fetch_all_clients_with_pagination(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const fetch_all_clients: IController = async (req: any, res: any) => {
    try {
        let results = await clientService.fetch_all_clients(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const save_client_info: IController = async (req: any, res: any) => {
    try {
        let result = await clientService.save_client_info(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}


const fetch_all_cities: IController = async (req: any, res: any) => {
    try {
        // let results = await clientService.fetch_all_cites(req);
        const results = [
            { label: "Mumbai", value: "Mumbai", city_id: 1 },
            { label: "Pune", value: "Pune", city_id: 2 },
            { label: "Nagpur", value: "Nagpur", city_id: 3 },
            { label: "Thane", value: "Thane", city_id: 4 },
            { label: "Nashik", value: "Nashik", city_id: 5 },
            { label: "Aurangabad", value: "Aurangabad", city_id: 6 },
            { label: "Solapur", value: "Solapur", city_id: 7 },
            { label: "Kolhapur", value: "Kolhapur", city_id: 8 },
            { label: "Amravati", value: "Amravati", city_id: 9 }
        ]


        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}
const fetch_client_details_by_id: IController = async (req: any, res: any) => {
    try {

        let results = await clientService.fetch_client_details_by_id(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}
const updateClientDetails: IController = async (req: any, res: any) => {
    try {
        let results = await clientService.updateClientDetails(req);
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
    import_clients: import_clients,
    fetch_all_clients: fetch_all_clients,
    fetch_all_clients_with_pagination:fetch_all_clients_with_pagination,
    save_client_info:save_client_info,
    fetch_all_cities:fetch_all_cities,
    fetch_client_details_by_id:fetch_client_details_by_id,
    updateClientDetails: updateClientDetails
}
