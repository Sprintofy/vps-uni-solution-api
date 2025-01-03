'use strict';
import express from 'express'
const router = express.Router();
import { celebrate } from 'celebrate';
import organizationSchema from './schemas/organization.schema';
import organizationController from '../controllers/organization.controller';

router.post('/fetchAllOrganizations', celebrate(organizationSchema.fetchAllOrganizations), organizationController.fetchAllOrganizations);
router.get('/fetchOrganizationById', celebrate(organizationSchema.fetchOrganizationById), organizationController.fetchOrganizationById);
router.get('/fetchOrgRbacById', celebrate(organizationSchema.fetchOrgRbacById), organizationController.fetchOrgRbacById);

// router.post('/save-organization', tenantController.saveOrganizationWithDefaultPermission);

export default router;
