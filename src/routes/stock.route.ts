'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import stockSchema from "./schemas/stock.schema";
import stockController from "../controllers/stock.controller";

router.post('/import-stocks', stockController.import_stocks);

router.post('/fetch-all', stockController.fetch_all_stock_with_pagination);

router.get('/fetch-active-stock', stockController.fetch_active_stock);

router.delete('/delete-stock',celebrate(stockSchema.delete_stock),stockController.delete_stock);

export default router;
