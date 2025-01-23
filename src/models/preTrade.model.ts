'use strict';
import BaseModel from "./dbConnection/base.model";
import CONFIGS from "../config";

class ClientTradeModel extends BaseModel {
    constructor() {
        super();
    }

    async fetchAllClientsTrades(organization_id:number,searchText:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(organization_id)
        let query =`SELECT DISTINCT c.client_id,c.organization_id,c.client_code,c.client_name,
            c.mobile,c.email,c.client_name
            FROM pre_trades pt
            LEFT JOIN clients c ON c.client_id = pt.client_id
            LEFT JOIN pre_trades_info pti ON pti.pre_trade_info_id = pt.pre_trade_info_id
            LEFT JOIN pre_trades_files ptf ON ptf.pre_tades_file_id = pti.pre_tades_file_id
            WHERE pt.organization_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND c.client_name LIKE ? ", parameters.push('%' + searchText + '%')):""
        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += ""

        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);


        return await this._executeQuery(query, parameters)
    }

    async fetchAllClientsTradesCount(organization_id:number ,searchText:any) {
        let parameters=[]
        parameters.push(organization_id)
        let query =`SELECT COUNT(DISTINCT c.client_id) as total
            FROM pre_trades pt
            LEFT JOIN clients c ON c.client_id = pt.client_id
            LEFT JOIN pre_trades_info pti ON pti.pre_trade_info_id = pt.pre_trade_info_id
            LEFT JOIN pre_trades_files ptf ON ptf.pre_tades_file_id = pti.pre_tades_file_id
            WHERE pt.organization_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND  client_name LIKE ?  ", parameters.push('%' + searchText + '%')):""
        return await this._executeQuery(query, parameters)
    }

    async saveClientTradeInfo(data: any) {
        const query = `INSERT INTO client_pre_trade_info SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClientTrade(data: any) {
        const query = `INSERT INTO client_trades SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    /***************** Pre Trades  *********************/

    async fetch_existing_pre_trade_client_ids(data: any) {
        const query = `SELECT * FROM  pre_trades WHERE client_id IN ( ? ) ;`;
        return await this._executeQuery(query, [data]);
    }


    async fetch_trade_by_client(client_id: number) {
        const query = `SELECT * FROM pre_trades WHERE client_id = ? `;
        return await this._executeQuery(query, [client_id]);
    }

    async save_pre_trade(data: any) {
        const query = `INSERT INTO pre_trades SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async update_pre_trade(data: any) {
        const query = `UPDATE pre_trades SET ? WHERE pre_trade_id = ? ;`;
        return await this._executeQuery(query, [data]);
    }

    /***************** Pre Trades Info *********************/

    async save_trade_info(data: any) {
        const query = `INSERT INTO pre_trades_info SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async update_pre_trade_info(data: any,pre_trade_info_id:number) {
        const query = `UPDATE pre_trades_info SET ? WHERE pre_trade_info_id = ?;`;
        return await this._executeQuery(query, [data,pre_trade_info_id]);
    }
    async fetch_all_clients_trades_logs(client_id:number,searchText:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(client_id)
        let query =`SELECT c.client_id,c.organization_id,c.client_code,c.client_name,
            c.mobile,c.email,pti.pre_trade_info_id, pti.pre_tades_file_id, pti.exchange_code, pti.buy_or_sell, 
            pti.product, pti.script_name, pti.quantity, pti.lots, pti.order_type, pti.price, pti.discounted_quantity, 
            pti.trigger_price, pti.order_life, pti.gtd_value, pti.created_date,ptf.original_file_name
            FROM pre_trades_info pti
            LEFT JOIN clients c ON c.client_id = pti.client_id
            LEFT JOIN pre_trades_files ptf ON ptf.pre_tades_file_id = pti.pre_tades_file_id
            WHERE pti.client_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND c.client_name LIKE ? ", parameters.push('%' + searchText + '%')):""
        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += ""

        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters)
    }

    async fetch_all_clients_trades_logs_count(client_id:number ,searchText:any) {
        let parameters=[]
        parameters.push(client_id)
        let query =`SELECT COUNT(DISTINCT pti.pre_trade_info_id) as total
            FROM pre_trades_info pti
            LEFT JOIN clients c ON c.client_id = pti.client_id
            LEFT JOIN pre_trades_files ptf ON ptf.pre_tades_file_id = pti.pre_tades_file_id
            WHERE pti.client_id = ? `
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND  first_name LIKE ?  ", parameters.push('%' + searchText + '%')):""
        return await this._executeQuery(query, parameters)
    }


    /***************** file logs *********************/

    async save_trade_file_log(data: any) {
        const query = `INSERT INTO pre_trades_files SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async update_pre_trade_file_log(data: any,pre_tades_file_id:number) {
        const query = `UPDATE pre_trades_files SET ? WHERE pre_tades_file_id = ? ;`;
        return await this._executeQuery(query, [data,pre_tades_file_id]);
    }

    /************** pre trade proofs *****************/

    async fetch_trade_proof_by_client_id(client_is: number) {
        const query = `select 
        pre_trade_proof_id, client_id, client_code, organization_id, 
        is_email_sent, is_email_received, email_url, email_proof, CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pdf_url)as pdf_url, 
        email_response, status, created_by, updated_by, created_date, updated_date
        FROM pre_trade_proofs where client_id =  ? `;
        return await this._executeQuery(query, [client_is]);
    }


    async fetch_all_trade_proof_urls() {
        const query = `select 
        pre_trade_proof_id, client_code ,created_date ,  CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pdf_url)as pdf_url    
        FROM pre_trade_proofs`;
        return await this._executeQuery(query, []);
    }



    async fetch_all_trade_proof_urls_by_client_id(client_id:number) {
        const query = `select 
        pre_trade_proof_id, client_code ,created_date ,  CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pdf_url)as pdf_url    
        FROM pre_trade_proofs where client_id = ?`;
        return await this._executeQuery(query, [client_id]);
    }



    async save_pre_trade_proofs(data: any) {
        const query = `INSERT INTO pre_trade_proofs SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async update_pre_trade_proofs(data: any,pre_trade_proof_id:number) {
        const query = `UPDATE pre_trade_proofs SET ? WHERE pre_trade_proof_id = ?;`;
        return await this._executeQuery(query, [data,pre_trade_proof_id]);
    }
}

export default new ClientTradeModel()
