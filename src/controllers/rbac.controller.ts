'use strict';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../appConfigs/utilities/apiResponse';
import IController from '../appConfigs/utilities/IController';
import MESSAGES from '../common/messages/messages';
import rbacService from '../services/rbac.service';
import rbacPageNCta from '../services/rbacPageNCta.service';
const LOGGER = new (require('../appConfigs/utilities/logger').default)('rbac.ts');

const fetchUserNavigationPermissions: IController = async (req: any, res: any) => {
    try {
        let result: any = await rbacService.V1_fetchUserPageNCtaPermission(req);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message, null);
        } else {
            apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
        }
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null)
    }
}

const fetchRolePermissionsById: IController = async (req: any, res: any) => {
    try {
        let result = await rbacService.fetchRolePermissionsDetailsById(req);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message, null);
        } else {
            apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
        }
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
    }
};

const fetchRoleDetailsById: IController = async (req: any, res: any) => {
    try {
        let result = await rbacService.fetchRoleDetailsById(req);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.NOT_FOUND, result.message, null);
        } else {
            apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
        }
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
    }
};

const fetchAllRbacRoles: IController = async (req: any, res: any) => {
    try {
        let result = await rbacService.fetchAllRbacRoles(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result)
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message, null);
        } else {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, MESSAGES.COMMON.SOMETHING_WRONG, null)
        }
    }
}

const savePage: IController = async (req: any, res: any) => {
    try {
        const result: any = await rbacPageNCta.savePage(req);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message, null);
        } else {
            apiResponse.success(res, httpStatusCodes.CREATED, MESSAGES.COMMON.SUCCESS.SAVE, result);
        }
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.INTERNAL_SERVER_ERROR, error.message, null);
    }
}

const saveCta: IController = async (req: any, res: any) => {
    try {
        const result: any = await rbacPageNCta.saveCta(req);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message, null);
        } else {
            apiResponse.success(res, httpStatusCodes.CREATED, MESSAGES.COMMON.SUCCESS.SAVE, result);
        }
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.INTERNAL_SERVER_ERROR, error.message, null);
    }
}

const fetchAllPagesAndCtas: IController = async (req: any, res: any) => {
    try {
        const result = await rbacService.fetchAllPagesAndCtas();
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message, null);
        } else {
            apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.FETCH, result);
        }
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.INTERNAL_SERVER_ERROR, error.message, null);
    }
};

export const addNewRole: IController = async (req: any, res: any) => {
    try {
        const createdRoleId = await rbacService.createRoleWithPermissions(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.SAVE, { roleId: createdRoleId });
    } catch (error: any) {
        apiResponse.error(res, httpStatusCodes.INTERNAL_SERVER_ERROR, error.message, null);
    }
};

const deleteRbacRole = async (req: any, res: any) => {
    try {
        const result = await rbacService.deleteRbacRole(req);
        apiResponse.success(res, httpStatusCodes.OK, MESSAGES.COMMON.SUCCESS.DELETE, result);
    } catch (error: any) {
        if (error instanceof Error) {
            apiResponse.error(res, 400, error.message, null);
        } else {
            apiResponse.error(res, 400, MESSAGES.COMMON.SOMETHING_WRONG, null);
        }
    }
};

export default {
    fetchUserNavigationPermissions,
    fetchRolePermissionsById,
    fetchRoleDetailsById,
    fetchAllRbacRoles,
    savePage,
    saveCta,
    fetchAllPagesAndCtas,
    addNewRole,
    deleteRbacRole
}
