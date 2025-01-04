'use strict';
import healthCheckService from './healthCheck.services';
import httpStatusCodes from "http-status-codes";
import IController from '../appConfigs/utilities/IController';
import apiResponse from '../appConfigs/utilities/apiResponse';
import MESSAGES from '../common/messages/messages';

const healthCheck: IController = async (req, res) => {
    try {
        const results = await healthCheckService.healthCheck();
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results);
    } catch (err: any) {
        if (err instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, err.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
};

export default {
    healthCheck: healthCheck
};
