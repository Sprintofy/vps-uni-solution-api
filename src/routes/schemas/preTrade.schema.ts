'use strict';
import { Joi, Segments } from 'celebrate';

export default {
    save_pre_trade: {
        [Segments.BODY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
            organization_id: Joi.number().integer().required(),
            client_code: Joi.string().trim().required(),
            trade_info: Joi.array().items(
                Joi.object().keys({
                    client_id: Joi.number().integer().required(),
                    client_code: Joi.string().trim().required(),
                    exchange_code: Joi.string().trim().required(),
                    buy_or_sell: Joi.string().trim().required(),
                    script_name: Joi.string().trim().required(),
                    product: Joi.string().trim().required(),
                    price: Joi.number().required(),
                    trigger_price: Joi.number().required(),
                    quantity: Joi.number().integer().required(),
                    discounted_quantity: Joi.number().integer().required(),
                    order_type: Joi.string().trim().required(),
                    order_life: Joi.string().trim().required(),
                    gtd_value: Joi.string().trim().allow(''), // Allowing empty strings
                    lots: Joi.number().integer().required()
                }).unknown(false) // Disallow extra fields in trade_info objects
            ).required() // trade_info array is required
        }).unknown(false).options({ abortEarly: false }) // Disallow extra fields in the body
    }
};
