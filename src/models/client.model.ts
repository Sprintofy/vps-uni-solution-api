'use strict';
import BaseModel from "./dbConnection/base.model";

class ClientModel extends BaseModel {
    constructor() {
        super();
    }

    async saveClientFileLog(data: any) {
        const query = `INSERT INTO client_files SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClient(data: any) {
        const query = `INSERT INTO clients SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClientProfile(data: any) {
        const query = `INSERT INTO client_profile SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClientAddress(data: any) {
        const query = `INSERT INTO client_address SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

}

export default new ClientModel()
