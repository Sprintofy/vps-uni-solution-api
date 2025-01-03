'use strict';
import express from 'express';
import * as HttpStatus from 'http-status-codes';
import { CelebrateError, isCelebrateError } from 'celebrate';
import { ValidationError } from 'joi';

/**
 * Joi error handler middleware
 *
 * @param {object} err
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */
export default (
    err: CelebrateError,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    if (isCelebrateError(err)) {
        const results: { source: string; field: string; message: string }[] = [];
        err.details.forEach((validationError: ValidationError, source: string) => {
            validationError.details.forEach((error) => {
                results.push({
                    source,
                    field: error.context?.key || 'unknown',
                    message: error.message,
                });
            });
        });
        const response = {
            status: HttpStatus.BAD_REQUEST,
            message: HttpStatus.getStatusText(HttpStatus.BAD_REQUEST),
            results,
        };
        return res.status(HttpStatus.BAD_REQUEST).json(response);
    }
}
