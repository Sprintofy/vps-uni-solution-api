'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import clientSchema from "./schemas/client.schema";
import clientController from "../controllers/client.controller";

router.post('/import-clients', clientController.import_clients);

router.post('/fetch-all', clientController.fetch_all_clients);

export default router;
