'use strict';
import BaseModel from "./dbConnection/base.model";

class ClientModel extends BaseModel {
    constructor() {
        super();
    }
    async fetchClientInfoByIds(ids: any,organization_id:number) {
        const query = `SELECT * FROM clients 
        WHERE client_code IN (?)
        AND organization_id = ?;`;
        return await this._executeQuery(query, [ids,organization_id]);
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
