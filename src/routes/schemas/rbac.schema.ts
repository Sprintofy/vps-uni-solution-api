'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    fetchUserNavigationPermissions: {
        [Segments.QUERY]: Joi.object().keys({
            user_id: Joi.number().integer().required(),
        })
    },
    fetchAllRbacRoles: {
        [Segments.BODY]: Joi.object().keys({
            pageIndex: Joi.number().integer().required(),
            pageSize: Joi.number().integer().required(),
            sort: Joi.object({
                order: Joi.string().trim().valid('asc', 'desc').insensitive().allow(''),
                key: Joi.string().trim().valid('role_id', 'role_name', 'role_description', 'status', 'created_date').allow('')
            }).required(),
            query: Joi.string().allow('')
        }).unknown().options({ abortEarly: false })
    },
    deleteRbacRole: {
        [Segments.QUERY]: Joi.object().keys({
            role_id: Joi.number().required()
        }).unknown(false)
    },
    fetchRolePermissionsById: {
        [Segments.QUERY]: Joi.object().keys({
            role_id: Joi.number().integer().required()
        })
    },
    fetchRoleDetailsById: {
        [Segments.QUERY]: Joi.object().keys({
            role_id: Joi.number().integer().required()
        })
    }


};
