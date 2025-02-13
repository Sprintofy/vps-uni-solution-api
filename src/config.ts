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
            ACCESS_TOKEN:"ya29.a0AXeO80SPv8jXehbxXeUPBYS9NeO8wopiqe5OTCiWHGLGpkugaOcOrZbjYV6ddpOVaUuMVaNEaX70rzngzGfaNdTl3D3oNDQ31_YUJnZIPkSRxuMxhYXr9pWervTzOiEzkYUz8sT3_ncPTHAKzHeEFaUF0VR8e-ytFozz5zC7aCgYKAQ8SARMSFQHGX2MijZ6jysjKH5EhIOW7hsIngQ0175",
            REFRESH_TOKEN:"1//04gNlIfszi_ciCgYIARAAGAQSNwF-L9Irl20YreEfGNHjMMETEn3CPhlu1I9y_5Giy3NHTkZrLHBHYrCAc8tDMTrJkJzrNVW5-6U",
            REDIRECT_URIS:["https://oauth2.googleapis.com/token"]
        }
    }
}


