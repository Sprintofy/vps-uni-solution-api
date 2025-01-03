import { Response } from 'express';
import httpStatusCodes from 'http-status-codes';
export interface IOverrideRequest {
    code: number;
    message: string;
    positive: string;
    negative: string;
}

export interface ICookie {
    key: string;
    value: string;
}
export default class ApiResponse {
    static success = ( res: Response, status: number = 200, message: string, results: any, //cookie: ICookie = null,
    ) => {
        res.status(status);
        /* if (cookie) {
             res.cookie(cookie.key, cookie.value);
         }*/
        res.json({
            status,
            message: message || "SUCCESS",
            results
        });
    };

    static error = (res: Response, status: number = 400, error: string,results: any) => {
        res.status(status).json({
            status,
            message: error ||  httpStatusCodes.getStatusText(status),
            results: results || null
        });
    };

    static setCookie = (res: Response, key: string, value: string) => {
        res.cookie(key, value);
    };
}
