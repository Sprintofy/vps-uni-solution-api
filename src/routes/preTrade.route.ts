'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import clientTradeSchema from "./schemas/preTrade.schema";
import clientTradeController from "../controllers/preTrade.controller";

router.post('/import-trades', clientTradeController.import_trades);

router.post('/fetch-all', clientTradeController.fetch_all_clients_trades);

router.post('/fetch-all-logs', celebrate(clientTradeSchema.fetch_logs_by_clients),clientTradeController.fetch_all_clients_trades_logs);

router.get('/trade-details', clientTradeController.fetch_trades_details_by_client_id);

router.post('/save-trades',celebrate(clientTradeSchema.save_pre_trade),clientTradeController.save_trades_by_client);



export default router;
