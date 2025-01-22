'use strict';
import BaseModel from "./dbConnection/base.model";

class ClientModel extends BaseModel {
    constructor() {
        super();
    }

    async fetch_all_clients(organization_id:number) {
        const query = `SELECT client_id,client_code,client_name,email,mobile,status  FROM clients 
        WHERE organization_id = ? ;`;
        return await this._executeQuery(query, [organization_id]);
    }

    async fetch_all_clients_with_pagination(organization_id:number,searchText:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(organization_id)
        let query =`SELECT client_id,client_code,client_name,email,mobile,status 
         FROM clients
         WHERE organization_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND client_name LIKE ? ", parameters.push('%' + searchText + '%')):""
        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += ""

        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters)
    }

    async fetch_all_clients_count(organization_id:number ,searchText:any) {
        let parameters=[]
        parameters.push(organization_id);
        let query = `SELECT COUNT(client_id) as total FROM clients
         WHERE organization_id = ? `;
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND  client_name LIKE ?  ", parameters.push('%' + searchText + '%')):""
        return await this._executeQuery(query, parameters)
    }

    async fetch_client_info_by_id(client_id: any) {
        const query = `SELECT c.client_id,c.client_code,c.client_name,c.email,c.mobile,c.status,
         ca.address_1,ca.address_2,ca.city_id,ca.city as city_name
         FROM clients c
         LEFT JOIN client_address ca ON ca.client_id = c.client_id
         WHERE c.client_id  = ? `;
        return await this._executeQuery(query, [client_id]);
    }

    async fetchClientInfoByIds(ids: any,organization_id:number) {
        const query = `
        SELECT 
        DISTINCT client_id,client_code,client_name,email,mobile,status,organization_id
        FROM clients 
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
