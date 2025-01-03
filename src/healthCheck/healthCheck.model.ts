'use strict';
import BaseModel from "../models/dbConnection/base.model";

class HealthCheckModel extends BaseModel {
    constructor() {
        super();
    }
    // fetch mysql db
    async healthCheck(){
        return await this._executeQuery("SELECT NOW();", []);
    }
}

export default new HealthCheckModel()
