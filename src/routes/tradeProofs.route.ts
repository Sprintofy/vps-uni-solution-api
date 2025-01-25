'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import tradeProofsSchema from "./schemas/preTrade.schema";
import tradeProofsController from "../controllers/tradeProofs.controller";

router.post('/fetch-all-proofs',celebrate(tradeProofsSchema.pre_trade_proofs), tradeProofsController.fetch_all_clients_proofs);

router.post('/fetch-all-trades', tradeProofsController.fetch_pre_trades_by_client_id);

// Download
router.get('/download-all-pdf',tradeProofsController.download_all_pdf);

router.get('/download-all-email',tradeProofsController.download_all_email);

router.get('/download-all-client-email',tradeProofsController.download_all_email_by_client);

router.get('/download-all-client-pdf',tradeProofsController.download_all_pdf_by_client);

router.get('/download-trade-email',tradeProofsController.download_all_pdf);

router.get('/download-trade-pdf',tradeProofsController.download_all_pdf);

export default router;
