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
            ACCESS_TOKEN:"ya29.a0AXeO80QeN4nT9s-lC4Nfus_OC2v_n5wBKlkAQrRJ5KM7Ji2fEy15CfQ0_3fDpUPK9NHoo_VbEai5TZgk1tqsL8pEuOJoLoR-ojbUnBwYcWWqdaXwU2tKOSaZDYhwrcf04C-7E3OJuI7w45MHHseGBnbdHhfNGT56XQ_pBZbiaCgYKAScSARMSFQHGX2Mig004kpSs3jsT6-X9buj4TA0175",
            REFRESH_TOKEN:"1//04bElW-e4LIgvCgYIARAAGAQSNwF-L9IrPdeXV_4z1kwnJ75ssyc90XJdDzX2emKsnInep7ImF-Fz2tWwNjGryhROKTZbpuxsBDk",
            REDIRECT_URIS:["https://oauth2.googleapis.com/token"]
        }
    }
}


