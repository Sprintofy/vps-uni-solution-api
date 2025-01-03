'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    getUser: {
        [Segments.QUERY]: Joi.object().keys({
            user_id: Joi.number().required(),
            test: Joi.number().required()
        }).unknown().options({ abortEarly: false })
    },
    fetchAllUsers: {
        [Segments.BODY]: Joi.object().keys({
            pageIndex: Joi.number().integer().required(),
            pageSize: Joi.number().integer().required(),
            sort: Joi.object({
                order: Joi.string().trim().valid('asc', 'desc').insensitive().allow(''),
                key: Joi.string().trim().valid('user_id', 'first_name', 'last_name', 'email', 'status', 'registered_date').allow('')
            }).required(),
            query: Joi.string().allow('')
        }).unknown().options({ abortEarly: false })
    },

};
