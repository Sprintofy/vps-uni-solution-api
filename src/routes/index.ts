'use strict';
import  {Router} from 'express';
const router = Router();

// import health check routes
import healthCheckRoute from "../healthCheck/healthCheck.routes";
router.use('/',healthCheckRoute);

// import routes
import usersRoute from "./user.route";
import rbacRoute from "./rbac.route";
import organizationRoute from "./organization.route";
import roleRoute from "./role.route";
import clientRoute from "./client.route";
import tradeRoute from "./preTrade.route";
import stockRoute from "./stock.route";
import instructionOrder from "./postTrade.route";

// route use
router.use('/user',usersRoute);
router.use('/rbac',rbacRoute);
router.use('/organization',organizationRoute);
router.use('/role',roleRoute);
router.use('/clients',clientRoute);
router.use('/trades',tradeRoute);
router.use('/stocks',stockRoute);
router.use('/instruction-order',instructionOrder);

export default router;
