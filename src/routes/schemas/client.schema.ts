'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    fetch_active_clients: {
        [Segments.QUERY]: Joi.object().keys({
            organization_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    }
};
