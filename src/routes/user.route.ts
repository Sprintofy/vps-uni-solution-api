'use strict';
import express from 'express'
const router = express.Router();
import { celebrate } from 'celebrate';
import userSchema from './schemas/user.schema';
import userController from '../controllers/user.controller';


router.post('/login-email', userController.loginWithEmail);

router.get('/info', userController.userInfo);

/************* User management **************/

router.post('/fetchAllUsers', celebrate(userSchema.fetchAllUsers), userController.fetchAllUsers);

router.get('/fetchUserDetailsById', celebrate(userSchema.fetchUserDetailsById), userController.fetchUserDetailsById);

router.get('/fetchAllRolesDropdown', userController.fetchAllRolesDropdown);

router.get('/fetchUserPermissionsById', celebrate(userSchema.fetchUserPermissionsById), userController.fetchUserPermissionsById);

export default router;
