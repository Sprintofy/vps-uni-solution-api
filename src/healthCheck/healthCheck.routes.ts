'use strict';
import express from 'express'
const router = express.Router();
import healthCheckController from './healthCheck.controller';

router.get("/", healthCheckController.healthCheck);

export default router;
