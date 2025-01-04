'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    import_clients: {
        [Segments.QUERY]: Joi.object().keys({
            user_id: Joi.number().integer().required(),
        })
    },
};
