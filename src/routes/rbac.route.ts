'use strict';
import express from 'express';
const router = express.Router();
import { celebrate } from 'celebrate';
import rbacSchema from './schemas/rbac.schema';
import rbacController from '../controllers/rbac.controller';

// Fetch user permissions for dynamic navigation based on the logged-in user
router.get('/fetchUserNavigationPermissions', celebrate(rbacSchema.fetchUserNavigationPermissions), rbacController.fetchUserNavigationPermissions);

// Fetch role details and permissions by role ID
router.get('/fetchRolePermissionsById', celebrate(rbacSchema.fetchRolePermissionsById), rbacController.fetchRolePermissionsById);

router.get('/fetchRoleDetailsById', celebrate(rbacSchema.fetchRoleDetailsById), rbacController.fetchRoleDetailsById);

router.post('/fetchAllRbacRoles', celebrate(rbacSchema.fetchAllRbacRoles), rbacController.fetchAllRbacRoles);

// Save a new page or subpage
router.post('/savePage', rbacController.savePage);

// Save a new CTA (Call to Action)
router.post('/saveCta', rbacController.saveCta);

// Fetch all pages and CTAs for setting up a new user or role
router.get('/fetchAllPagesAndCtas', rbacController.fetchAllPagesAndCtas);

router.post('/addNewRole', rbacController.addNewRole);

router.delete('/deleteRbacRole', celebrate(rbacSchema.deleteRbacRole), rbacController.deleteRbacRole);

export default router;
