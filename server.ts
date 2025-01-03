'use strict';
const isMicroservice = process.env.MICROSERVICE;
if (isMicroservice) {
    const startMicroservices = require('./src/appConfigs/configs/microServices').default;
    startMicroservices();
} else {
    const app = require('./src/app').default;
    app.listen(process.env.PORT, () => {
        console.log(`Main server started on http://localhost:${process.env.PORT}`);
    });
}

