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
            ACCESS_TOKEN:"ya29.a0AXeO80TZj67Ced-GkaoF7g4950Q2IfSoCqMlpYy3WQ6SmubkxoJwpBtZpk6IRknQTBvaGL1F0mVGBZuiG058eBeJbDwjRmCg49WF_wI6BYYTzivuSVpQQmZju5OkvKrsOUZfE0Mp_O2uuP4yrlJsw4QlytebAcquf7NaqHOIaCgYKAaoSARMSFQHGX2MiPJ8p_6kv7IPC0sdbmRv-DA0175",
            REFRESH_TOKEN:"1//04W_A7NoUJbsxCgYIARAAGAQSNwF-L9IrTdnlh2KKZceqUEk5JObb9jUNTDRrS5pT87t-RVt5_ABq5RRN6hNgeZlkQ977n78H6UA",
            REDIRECT_URIS:["https://oauth2.googleapis.com/token"]
        }
    }
}


