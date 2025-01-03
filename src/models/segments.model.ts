'use strict';
import BaseModel from "./dbConnection/base.model";

class SegmentsModel extends BaseModel {
    constructor() {
        super();
    }

    /*********** CURD MODEL *************/

    async saveTenant(data:any) {
        const query = `INSERT INTO organization_branches SET ?  ;`;
        return await this._executeQuery(query,[data]);
    }

    async saveTenantLabWithTransaction(sqlConnection:any,data:any) {
        const query = `INSERT INTO organization_branches SET ?  ;`;
        return await this._executeQueryTransaction(sqlConnection,query,[data]);
    }

    async updateTenantLab(data:any,tenant_lab_id:number) {
        const query = `UPDATE organization_branches SET ? WHERE branch_id = ?  ;`;
        return await this._executeQuery(query,[data,tenant_lab_id]);
    }

    async updateTenantLabWithTransaction(sqlConnection:any,data:any,tenant_lab_id:number) {
        const query = `UPDATE organization_branches SET ? WHERE lab_id = ?  ;`;
        return await this._executeQueryTransaction(sqlConnection,query,[data,tenant_lab_id]);
    }

}



export default new SegmentsModel()
