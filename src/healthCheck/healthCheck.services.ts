'use strict';

import healthCheckModel from './healthCheck.model';

const healthCheck = async () => {
    return await healthCheckModel.healthCheck();
};

export default {
    healthCheck: healthCheck
}
