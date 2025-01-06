'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import clientSchema from "./schemas/client.schema";
import clientTradeController from "../controllers/clientTrade.controller";

router.post('/import-trades', clientTradeController.import_trades);

router.post('/fetch-all', clientTradeController.fetch_all_clients_trades);

export default router;
