'use strict';
import { Joi, Segments } from 'celebrate';

const fileServiceSchema = Joi.object({
    fields: Joi.object({
        user_id: Joi.string().required().label("User ID"),
        organization_id: Joi.string().required().label("Organization ID"),
    }).required().label("Fields"),

    files: Joi.array()
        .min(1)
        .required()
        .label("Files")
        .messages({
            "array.min": "At least one file must be uploaded.",
            "any.required": "Files are required.",
        }),
}).unknown(true).options({ abortEarly: false });

export default {fileServiceSchema};
