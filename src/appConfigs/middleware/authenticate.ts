'use strict';

import express from 'express';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../utilities/apiResponse';
import Encryption from '../utilities/encryption';
import { extractCookieFromRequest } from '../utilities/apiUtilities';
import application from '../configs/applications';
import { isEmpty } from "lodash";
import { v4 as uuidv4 } from 'uuid';
import url from 'url';

/**
 * Route authentication middleware to verify a token
 *
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 *
 */
const authorizationIgnorePath: string[] = application.authorizationIgnorePath;
let isByPassCheck: boolean = false; // Assuming this flag will be controlled from somewhere in your application

const authenticateMiddleware = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    const parsedUrl = url.parse(req.url);

    // Generate and set X-Request-Id if not present
    let requestId = req.headers['X-Request-Id'];
    if (isEmpty(requestId)) {
        requestId = uuidv4();
        req.headers['X-Request-Id'] = requestId;
    }
    res.setHeader('X-Request-Id', requestId as string);

    // Bypass authentication check if isByPassCheck is true
    if (isByPassCheck) {
        return next();
    }

    if (parsedUrl.pathname && parsedUrl.pathname.includes('/api-docs')) {
        // Ignore token validation for URLs containing "/api-docs"
        return next();
    } else if (authorizationIgnorePath.indexOf(`${parsedUrl.pathname}`) === -1) {
        const authorizationHeader = extractCookieFromRequest(req, 'authorization');
        if (authorizationHeader) {
            try {
                const decoded = await new Encryption().verifyJwtToken(authorizationHeader);
                if (decoded) {
                    // @ts-ignore
                    req.user = decoded;
                } else {
                    return apiResponse.error(res, httpStatusCodes.UNAUTHORIZED, '', null);
                }
            } catch (error) {
                return apiResponse.error(res, httpStatusCodes.UNAUTHORIZED, '', null);
            }
        } else {
            return apiResponse.error(res, httpStatusCodes.FORBIDDEN, '', null);
        }
    }
    next();
};

export default authenticateMiddleware;
