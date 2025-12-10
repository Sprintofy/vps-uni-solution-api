"use strict";

const ENV = process.env;

export default {
  NODE_ENV: ENV.NODE_ENV,
  BASE_URL: ENV.BASE_URL,
  DATABASE: {
    DB: {
      host: ENV.MASTER_DB_HOST,
      user: ENV.MASTER_DB_USER,
      password: ENV.MASTER_DB_PASSWORD,
      database: ENV.MASTER_DB_NAME,
      timezone: ENV.MASTER_DB_TIMEZONE,
    },
  },
  SECURITY: {
    JWT_TOKEN: {
      SECRET_KEY: ENV.JWT_TOKEN_SECRET_KEY,
      EXPIRY: ENV.JWT_TOKEN_EXPIRY,
    },
  },
  // AWS : {
  //     S3: {
  //         BASE_URL: ENV.AWS_S3_BASE_URL,
  //         ACCESS_KEY: ENV.AWS_S3_ACCESS_KEY,
  //         SECRET_KEY: ENV.AWS_S3_SECRET_KEY,
  //         BUCKET_NAME: ENV.AWS_S3_BUCKET_NAME || 'dev-s3-uni-solution',
  //         REGION: ENV.AWS_S3_BUCKET_REGION
  //     }
  // },
  FILE_STORAGE: {
    BASE_URL: ENV.FILE_STORAGE_BASE_URL || "https://cdn.digimatrixpro.com",
    PUBLIC_URL:
      ENV.FILE_STORAGE_PUBLIC_URL || "https://cdn.digimatrixpro.com/public",
    API_KEY:
      ENV.FILE_STORAGE_API_KEY ||
      "fss_970ca7cb162cfe13b4514bb26d4f971b6db19018fd9c3e977f3236946b3fc20c",
    TENANT_SLUG: ENV.FILE_STORAGE_TENANT_SLUG || "uni-solution",
    DEFAULT_BUCKET: ENV.FILE_STORAGE_DEFAULT_BUCKET || "organization-files",
    SECREATE_KEY:
      ENV.FILE_STORAGE_SECREATE_KEY ||
      "secret_61e3443bda4db80abc9cb7d8153c38b500f76990efb3b1be8f7b1c448f48d9dd",
  },

  GOOGLE_AUTH: {
    WEB: {
      CLIENT_ID:
        "609328400639-fcqe2mgg5q08t0cfo80ludav7cinl2ti.apps.googleusercontent.com",
      PROJECT_ID: "pre-trade-email",
      AUTH_URI: "https://accounts.google.com/o/oauth2/auth",
      TOKEN_URI: "https://oauth2.googleapis.com/token",
      AUTH_PROVIDE_CERT_URL: "https://www.googleapis.com/oauth2/v1/certs",
      CLIENT_SECRETE: "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",
      ACCESS_TOKEN:
        "ya29.a0AXeO80T_vF6QD0IGe05U2aWSkmgtkVy8mP4LBJW0CRTslHszPYd89eUAEhSm_u34y8FZJMsjaDjDzD-LHda3JajnodExWJoMh5zn_ALoDywiXoo1zpBYg6WrgsU1yd8as0AP7BEKmZ6zXQtf0HPo194J0n9MCvPn52Y79vR6aCgYKAUUSARMSFQHGX2MiLSP9nnSK6hjtBri_2wZZDA0175",
      REFRESH_TOKEN:
        "1//0gYRh8fYEXrLbCgYIARAAGBASNwF-L9IraAU8qsrgMaaCbCvYXTNe3-NsKYObgQxheIIZFLVQ5pqYSzqROlfLplG0cQ-sp2PI85U",
      REDIRECT_URIS: [
        "https://oauth2.googleapis.com/token",
        "http://localhost:3007/token",
      ],
    },
  },
};
