'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import clientSchema from "./schemas/client.schema";
import clientController from "../controllers/client.controller";

router.post('/import-clients', clientController.import_clients);

// todo add joi validation
router.post('/save-client', clientController.save_client_info);

router.get('/fetch-by-id',clientController.fetch_client_details_by_id)

router.post('/fetch-all', celebrate(clientSchema.fetch_all_clients),clientController.fetch_all_clients_with_pagination);

router.get('/fetch-all',celebrate(clientSchema.fetch_active_clients), clientController.fetch_all_clients);

// todo move to another route
router.get('/fetch-city', clientController.fetch_all_cities);

router.put('/update-client-info',clientController.updateClientDetails)


export default router;
