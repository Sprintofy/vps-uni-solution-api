'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import instructionOrderSchema from "./schemas/postTrade.schema";
import instructionOrderController from "../controllers/postTrade.controller";

router.post('/import-order', instructionOrderController.import_instruction_order);

router.post('/fetch-all', instructionOrderController.fetch_all_clients_trades);

router.get('/trade-details', instructionOrderController.trade_details);

export default router;
