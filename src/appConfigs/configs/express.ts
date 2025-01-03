'use strict';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import path from "path";
import morganLogger from '../middleware/morganLogger';
import authenticate from '../middleware/authenticate';
import joiErrorHandler from "../middleware/joiErrorHandler";

const app = express();

// Middleware

app.options('*', cors());

// Custom headers and cache control middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token_access, user_id, User-agent");
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

app.use(morganLogger);
app.use(authenticate);

export default app;
