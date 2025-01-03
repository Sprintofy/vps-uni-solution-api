'use strict';
import express,{ Request, Response, NextFunction } from 'express';
import expressConfig from './appConfigs/configs/express';
import application from "./appConfigs/configs/applications";
import indexRoutes from '../src/routes/index';
import joiErrorHandler from "./appConfigs/middleware/joiErrorHandler";
import morganLogger from "./appConfigs/middleware/morganLogger";

const app = express();
// Use the common middleware from expressConfig.ts

app.use(express.json());

app.use(expressConfig);

// Use index Router file access the router
app.use(application.URL.BASE, indexRoutes);



// 404 Error Handler
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
        status: 404,
        message: 'Not Found..!'
    });
});

// Error Handling Middleware
app.use(joiErrorHandler);


export default app;
