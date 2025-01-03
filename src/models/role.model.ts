'use strict';
import BaseModel from "./dbConnection/base.model";

class RoleModel extends BaseModel {
    constructor() {
        super();
    }

    /************* Tenant Role ************************/

    async fetchActiveDefaultRoles() {
        const query = "SELECT * FROM rbac_organization_roles WHERE is_default = 1 AND status = 1 ;";
        return await this._executeQuery(query,[]);
    }

    async saveTenantRole(data:any) {
        const query = "INSERT INTO rbac_organization_roles SET ? ;"
        return await this._executeQuery(query,[data]);
    }

    async saveTenantRoleWithTransaction(sqlConnection:any,data:any) {
        const query = "INSERT INTO rbac_organization_roles SET ? ;"
        return await this._executeQueryTransaction(sqlConnection,query,[data]);
    }

    async updateTenantRole(data:any,organization_id:number) {
        const query = "UPDATE rbac_organization_roles SET ? WHERE organization_id = ? ;"
        return await this._executeQuery(query,[data,organization_id]);
    }

    async updateTenantRoleWithTransaction(sqlConnection:any,data:any,organization_id:number) {
        const query = "UPDATE rbac_organization_roles SET ? WHERE organization_id = ? ;"
        return await this._executeQueryTransaction(sqlConnection,query,[data,organization_id]);
    }

}

export default new RoleModel()
