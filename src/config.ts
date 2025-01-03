'use strict';

const ENV = process.env;

export default {
    NODE_ENV:ENV.NODE_ENV,
    BASE_URL: ENV.BASE_URL,
    DATABASE : {
        DB: {
            host: ENV.MASTER_DB_HOST,
            user: ENV.MASTER_DB_USER,
            password: ENV.MASTER_DB_PASSWORD,
            database: ENV.MASTER_DB_NAME,
            timezone: ENV.MASTER_DB_TIMEZONE
        }
    },
    SECURITY: {
       JWT_TOKEN: {
            SECRET_KEY: ENV.JWT_TOKEN_SECRET_KEY,
            EXPIRY: ENV.JWT_TOKEN_EXPIRY
        }
    }
}


