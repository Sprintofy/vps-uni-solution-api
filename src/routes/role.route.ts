'use strict';
import express from 'express'
const router = express.Router();
import {celebrate} from 'celebrate';
import roleSchema from './schemas/rbac.schema';
import roleController from '../controllers/role.conroller';



export default router;
