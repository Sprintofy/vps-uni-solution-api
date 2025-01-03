'use strict';
import BaseModel from "./dbConnection/base.model";

class rbacPageModel extends BaseModel {
    constructor() {
        super();
    }

    async savePages (data: any) {
        const query = "INSERT INTO rbac_pages SET ?";
        const result = await this._executeQuery(query, data);
        return result;
    }

    async updatePages (data: any,id:number) {
        const query = "INSERT INTO rbac_pages SET ?";
        const result = await this._executeQuery(query, data);
        return result;
    }


}



export default new rbacPageModel()
