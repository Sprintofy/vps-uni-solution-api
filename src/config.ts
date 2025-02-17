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
    },
    AWS : {
        S3: {
            BASE_URL: ENV.AWS_S3_BASE_URL,
            ACCESS_KEY: ENV.AWS_S3_ACCESS_KEY,
            SECRET_KEY: ENV.AWS_S3_SECRET_KEY,
            BUCKET_NAME: ENV.AWS_S3_BUCKET_NAME || 'dev-s3-uni-solution',
            REGION: ENV.AWS_S3_BUCKET_REGION
        }
    },
    GOOGLE_AUTH : {
        WEB: {
            CLIENT_ID:"609328400639-fcqe2mgg5q08t0cfo80ludav7cinl2ti.apps.googleusercontent.com",
            PROJECT_ID:"pre-trade-email",
            AUTH_URI:"https://accounts.google.com/o/oauth2/auth",
            TOKEN_URI:"https://oauth2.googleapis.com/token",
            AUTH_PROVIDE_CERT_URL:"https://www.googleapis.com/oauth2/v1/certs",
            CLIENT_SECRETE:"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",
            ACCESS_TOKEN:"ya29.a0AXeO80TgoukoeJSTt-MjAjkv_O8QXsI_2YhrN0NnDJSRHrDb1gsw-gWB6UnKN1TDvhO2HnCSw8-WinH-D2cLjo6ADNkS6o8d9TsNalr6fCNWAfIVi58Hzx4BVmY4NfkEgKhSDRT7J_XcZI-EoabBPlR_fZXkiVIfpR4FtzjSaCgYKARESARMSFQHGX2MiDR9EYZSfOVgY1IWm0P31ug0175",
            REFRESH_TOKEN:"1//04SCEUlYiLcPuCgYIARAAGAQSNwF-L9Irsw0ZhrYPWyhEwl3ybSlfALtWrTnKh_npJGhQERmELbByLMIN2NrA-rqLTyliI1thGnI",
            REDIRECT_URIS:["https://oauth2.googleapis.com/token"]
        }
    }
}


