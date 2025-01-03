'use strict';
const BASE = '/api';

export default {
    URL: {
        BASE,
    },
    timers: {

    },
    env: {

    },
    authorizationIgnorePath: [
        `${BASE}/healthCheck`,
        `${BASE}/user/login-email`,
    ],
};
