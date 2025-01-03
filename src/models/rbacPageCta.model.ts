'use strict';
import BaseModel from "./dbConnection/base.model";

class rbacPageCtaModel extends BaseModel {
    constructor() {
        super();
    }

    async savePageCta(data: any) {
        const query = 'INSERT INTO rbac_page_cta SET ? ;';
        return await this._executeQuery(query, data);
    }

    async updatePageCta(data: any,id:number) {
        const query = 'INSERT INTO rbac_page_cta SET ? ;';
        return await this._executeQuery(query, data);
    }


}



export default new rbacPageCtaModel()
