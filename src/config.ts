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
            CLIENT_ID:"314249027794-k9aaqmnmn02sqnobebv29au745045n4m.apps.googleusercontent.com",
            PROJECT_ID:"uni-solution",
            AUTH_URI:"https://accounts.google.com/o/oauth2/auth",
            TOKEN_URI:"https://oauth2.googleapis.com/token",
            AUTH_PROVIDE_CERT_URL:"https://www.googleapis.com/oauth2/v1/certs",
            CLIENT_SECRETE:"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",
            ACCESS_TOKEN:"ya29.a0AXeO80SoAMEdk3_HUuE5_xlKF8hK_v1UituR8jsKNxUoi9X6fqX1Oild4U2QW79yWD__XbX6d6SAHmxBT3VuYmbl_rX83aLyc0qK55wkX-RMiQ-WlLZQIY9bw_YFMJ6L7aavhW90OJIMLCoNOTydXC26DcZqFyciBSLsiXzAaCgYKAQQSARMSFQHGX2Mivuouz36V4k7PXbg4wsAxSQ0175",
            REFRESH_TOKEN:"1//0gf_PQpx4PCm_CgYIARAAGBASNwF-L9Ir_buhd7i6aVmO_i-U1lR_yOudlpuDpb9WONjA29XYHSaiEmCQ5Jtnh8qBCgNEKfGY-ow",
            REDIRECT_URIS:["http://localhost:3007/api/trade-proofs/oauth/callback"
            ]
        }
    }
}


