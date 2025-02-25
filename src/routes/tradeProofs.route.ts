'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import tradeProofsSchema from "./schemas/preTrade.schema";
import tradeProofsController from "../controllers/tradeProofs.controller";

router.post('/fetch-all-proofs',celebrate(tradeProofsSchema.pre_trade_proofs), tradeProofsController.fetch_all_clients_proofs);

router.post('/fetch-all-trades',celebrate(tradeProofsSchema.pre_trade_proofs), tradeProofsController.fetch_pre_trades_by_client_id);

// Download
router.get('/download-all-pdf',celebrate(tradeProofsSchema.download_all),tradeProofsController.download_all_pdf);

router.get('/download-all-email',celebrate(tradeProofsSchema.download_all),tradeProofsController.download_all_email);

router.get('/download-all-client-email',celebrate(tradeProofsSchema.download_all_client),tradeProofsController.download_all_email_by_client);

router.get('/download-all-client-pdf',celebrate(tradeProofsSchema.download_all_client),tradeProofsController.download_all_pdf_by_client);

router.get('/read-email',tradeProofsController.read_email);

router.get('/resend-email',tradeProofsController.resend_email);

router.get('/auth-url',tradeProofsController.generateAuthUrlC);
//
router.get('/oauth/callback',tradeProofsController.exchangeCodeForTokensC);
//
// router.get('/read-email-m',tradeProofsController.read_email_m);
//
// router.get('/get-email-download-progress',tradeProofsController.getEmailDownloadProgress);



export default router;
