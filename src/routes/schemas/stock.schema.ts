'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    delete_stock: {
        [Segments.QUERY]: Joi.object().keys({
            stock_id: Joi.number().integer().required(),
        }).unknown(false).options({ abortEarly: false }) // Disallow extra fields in the body
    }
};
