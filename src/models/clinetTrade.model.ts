'use strict';
import BaseModel from "./dbConnection/base.model";

class ClientTradeModel extends BaseModel {
    constructor() {
        super();
    }

    async fetchAllClientsTrades(organization_id:number,searchText:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(organization_id)
        let query =`SELECT ct.client_trade_id,c.client_id,c.organization_id,c.client_code,is_email_sent as status,
                        c.client_name,ct.file_log_id,CONCAT(ctf.original_file_name,' : ',ct.created_date) as trade_date,
                        c.mobile,c.email,c.client_name
                    FROM client_trades ct
                    LEFT JOIN clients c ON c.client_id = ct.client_id
                    LEFT JOIN client_tades_files ctf ON ctf.client_trade_file_id = ct.file_log_id
                    WHERE c.organization_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND c.client_name LIKE ? ", parameters.push('%' + searchText + '%')):""
        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += ""

        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters)
    }

    async fetchAllClientsTradesCount(organization_id:number ,searchText:any) {
        let parameters=[]
        parameters.push(organization_id)
        let query =`SELECT COUNT(client_trade_id) as total
                    FROM client_trades ct
                    LEFT JOIN clients c ON c.client_id = ct.client_id
                    LEFT JOIN client_tades_files ctf ON ctf.client_trade_file_id = ct.file_log_id
                    WHERE c.organization_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND  first_name LIKE ?  ", parameters.push('%' + searchText + '%')):""
        return await this._executeQuery(query, parameters)
    }


    async saveClientTradeFileLog(data: any) {
        const query = `INSERT INTO client_tades_files SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClientTradeInfo(data: any) {
        const query = `INSERT INTO client_trade_info SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClientTrade(data: any) {
        const query = `INSERT INTO client_trades SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

}

export default new ClientTradeModel()
