'use strict';
import { Joi, Segments } from 'celebrate';

export default {

    save_pre_trade: {
        [Segments.BODY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
            organization_id: Joi.number().integer().required(),
            client_code: Joi.string().trim().required(),
            unique_trade_info: Joi.array().items(
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
    },

    fetch_all_clients_trades:{
        [Segments.BODY]: Joi.object().keys({
            organization_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },

    pre_trade_proofs: {
        [Segments.BODY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },

    fetch_all_logs_by_clients: {
        [Segments.BODY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },

    fetch_trades_details_by_client_id: {
        [Segments.QUERY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
            proof_id:Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },

    fetch_logs_by_clients: {
        [Segments.QUERY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },

    download_all: {
        [Segments.QUERY]: Joi.object().keys({
            organization_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },

    download_all_client: {
        [Segments.QUERY]: Joi.object().keys({
            client_id: Joi.number().integer().required(),
        }).unknown(true).options({ abortEarly: false }) // Disallow extra fields in the body
    },
};
