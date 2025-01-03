'use strict';
import BaseModel from "./dbConnection/base.model";

class SegmentMappingModel extends BaseModel {
    constructor() {
        super();
    }

    /*********** CURD MODEL *************/

    async saveUserLabMappingWithTransaction(sqlConnection:any,data:any) {
        const query = `INSERT INTO user_branch_mapping SET ?  ;`;
        return await this._executeQueryTransaction(sqlConnection,query,[data]);
    }

}



export default new SegmentMappingModel()
