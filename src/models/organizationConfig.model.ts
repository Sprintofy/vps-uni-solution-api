'use strict';
import BaseModel from "./dbConnection/base.model";

class OrganizationConfigModel extends BaseModel {
    constructor() {
        super();
    }

    async fetchOrganizationConfig(organization_id: any) {
        let query = `SELECT *  FROM organization_cofigs WHERE organization_id = ${organization_id};`;
        return await this._executeQuery(query, []);
    }


}

export default new OrganizationConfigModel()
