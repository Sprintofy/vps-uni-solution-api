'use strict';
import express from 'express'
const router = express.Router();
import { celebrate } from 'celebrate';
import userSchema from './schemas/user.schema';
import userController from '../controllers/user.controller';


router.post('/login-email', userController.loginWithEmail);

router.get('/info', userController.userInfo);

/************* User management **************/

// Fetch all users
router.post('/fetchAllUsers', celebrate(userSchema.fetchAllUsers), userController.fetchAllUsers);


export default router;
