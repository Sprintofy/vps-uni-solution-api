'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import organizationService from '../services/organization.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('tenantController.ts');

/************ Services *****************************/

const fetchAllOrganizations: IController = async (req: any, res: any) => {
    try {
        const result = await organizationService.fetchAllOrganizations(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null);
        }
    }
}

const fetchOrganizationById: IController = async (req: any, res: any) => {
    try {
        const result = await organizationService.fetchOrganizationById(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null);
        }
    }
};

const fetchOrgRbacById: IController = async (req: any, res: any) => {
    try {
        let result = await organizationService.fetchOrgRbacDetailsById(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null);
        }
    }
};

const saveOrganizationWithDefaultPermission: IController = async (req: any, res: any) => {
    try {
        const results = await organizationService.saveOrganizationWithDefaultPermission(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, results);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

/************** MYSQL Crud Services *****************/

const saveTenant: IController = async (req: any, res: any) => {
    try {
        const results = await organizationService.saveOrganization(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.SAVE, results);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null);
        }
    }
}

const updateTenant: IController = async (req: any, res: any) => {
    try {
        const results = await organizationService.updateOrganization(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.UPDATE, results);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const deleteTenant: IController = async (req: any, res: any) => {
    try {
        const results = await organizationService.deleteTenant(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.DELETE, results);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

export default {
    saveOrganizationWithDefaultPermission,
    fetchAllOrganizations,
    fetchOrganizationById,
    fetchOrgRbacById,
    saveTenant,
    updateTenant,
    deleteTenant
}
