'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    fetchAllOrganizations: {
        [Segments.BODY]: Joi.object().keys({
            pageIndex: Joi.number().integer().required(),
            pageSize: Joi.number().integer().required(),
            sort: Joi.object({
                order: Joi.string().trim().valid('asc', 'desc').insensitive().allow(''),
                key: Joi.string().trim().valid('organization_id', 'organization_name', 'status', 'created_date').allow('')
            }).required(),
            query: Joi.string().allow('')
        }).unknown().options({ abortEarly: false })
    },
    fetchOrganizationById: {
        [Segments.QUERY]: Joi.object().keys({
            organization_id: Joi.number().integer().required()
        })
    },
    fetchOrgRbacById: {
        [Segments.QUERY]: Joi.object().keys({
            organization_id: Joi.number().integer().required()
        })
    }
};
