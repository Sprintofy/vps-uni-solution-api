'use strict';
import BaseModel from "./dbConnection/base.model";
import CONFIGS from "../config";

class ClientTradeModel extends BaseModel {
    constructor() {
        super();
    }

    async fetchAllClientsTradesByOrganization(organization_id:number,filter_data:any,search_text:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(organization_id)
        let query =`SELECT DISTINCT c.client_id,c.organization_id,c.client_code,c.client_name,
            c.mobile,c.email,c.client_name,ptp.created_date
            FROM pre_trades pt
            LEFT JOIN clients c ON c.client_id = pt.client_id
            LEFT JOIN pre_trade_proofs ptp ON pt.pre_proof_id = ptp.pre_trade_proof_id
            LEFT JOIN pre_trades_info pti ON pti.pre_trade_info_id = pt.pre_trade_info_id
            LEFT JOIN pre_trades_files ptf ON ptf.pre_tades_file_id = pti.pre_tades_file_id
            WHERE pt.organization_id = ? `

        filter_data && filter_data.is_email_received == 1 ? query+=" AND ptp.is_email_received = 1 ":"";
        filter_data && filter_data.is_email_received == -1 ? query+=" AND ptp.is_email_received = 0 ":"";


        if (filter_data && filter_data.start_date && filter_data.end_date) {
            query += ` AND DATE(ptp.created_date) BETWEEN '${filter_data.start_date}' AND '${filter_data.end_date}' `;
        }

        search_text !== undefined && search_text !== null && search_text !== "" ? (query+="  AND ( c.client_name LIKE ? OR c.client_code LIKE ? ) ", parameters.push('%' + search_text + '%','%' + search_text + '%')):""

        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += " "

        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters)
    }

    async fetchAllClientsTradesCountByOrganization(organization_id:number ,filter_data:any,search_text:any) {
        let parameters=[]
        parameters.push(organization_id)
        let query =`SELECT COUNT(DISTINCT c.client_id) as total
            FROM pre_trades pt
            LEFT JOIN clients c ON c.client_id = pt.client_id
            LEFT JOIN pre_trade_proofs ptp ON pt.pre_proof_id = ptp.pre_trade_proof_id
            LEFT JOIN pre_trades_info pti ON pti.pre_trade_info_id = pt.pre_trade_info_id
            LEFT JOIN pre_trades_files ptf ON ptf.pre_tades_file_id = pti.pre_tades_file_id
            WHERE pt.organization_id = ? `

        filter_data && filter_data.is_email_received == 1 ? query+=" AND ptp.is_email_received = 1 ":"";
        filter_data && filter_data.is_email_received == -1 ? query+=" AND ptp.is_email_received = 0 ":"";

        if (filter_data && filter_data.start_date && filter_data.end_date) {
            query += ` AND DATE(ptp.created_date) BETWEEN '${filter_data.start_date}' AND '${filter_data.end_date}' `;
        }

        search_text !== undefined && search_text !== null && search_text !== "" ? (query+="  AND ( c.client_name LIKE ? OR c.client_code LIKE ? )  ", parameters.push('%' + search_text + '%','%' + search_text + '%')):""

        return await this._executeQuery(query, parameters)
    }

    async fetchAllClientsProofsStatistics(organization_id:number,filter_data:any,search_text:any) {
        let parameters=[]
        parameters.push(organization_id)
        let query =`SELECT 
                        pt.client_id,
                        pt.total_trade_count as total_trades,
                        ptd.total_trade_count as today_trade,
                        COUNT(DISTINCT pre_trade_proof_id) as total_proof,
                        SUM(CASE WHEN pft.is_email_sent = 1 THEN 1 ELSE 0 END )  as total_email_sent,
                        SUM(CASE WHEN pft.email_url IS NOT NULL THEN 1 ELSE 0 END )  as total_email_received,
                        SUM(CASE WHEN pft.pdf_url IS NOT NULL THEN 1 ELSE 0 END )  as total_pdf_generated_count,
                        SUM(CASE WHEN DATE(pft.created_date) = '${filter_data.start_date}' AND pft.is_email_sent = 1 THEN 1 ELSE 0 END )  as today_email_sent,
                        SUM(CASE WHEN DATE(pft.created_date) = '${filter_data.start_date}' AND pft.email_url IS NOT NULL THEN 1 ELSE 0 END )  as today_email_received,
                        SUM(CASE WHEN DATE(pft.created_date) = '${filter_data.start_date}' AND pft.pdf_url IS NOT NULL THEN 1 ELSE 0 END )  as today_pdf_generated_count
                        FROM pre_trade_proofs pft
                        LEFT JOIN (
                        SELECT COUNT(DISTINCT pt.pre_trade_id) as total_trade_count,
                                pt.client_id
                                FROM pre_trades pt
                                GROUP BY pt.client_id
                        ) pt ON pt.client_id = pft.client_id
                        LEFT JOIN (
                        SELECT COUNT(DISTINCT pt.pre_trade_id) as total_trade_count,
                                pt.client_id
                                FROM pre_trades pt
                                WHERE DATE(pt.created_date) = '${filter_data.start_date}'
                                GROUP BY pt.client_id
                        ) ptd ON ptd.client_id = pft.client_id
                        WHERE pft.organization_id = ? `;

        filter_data && filter_data.is_email_received == 1 ? query+=" AND pft.is_email_received = 1 ":"";
        filter_data && filter_data.is_email_received == -1 ? query+=" AND pft.is_email_received = 0 ":"";

        // search_text !== undefined && search_text !== null && search_text !== "" ? (query+="  AND  client_name LIKE ?  ", parameters.push('%' + search_text + '%')):""

        query+=` GROUP BY pft.client_id `;
        return await this._executeQuery(query, parameters)
    }

    async fetchAllOrganizationProofsStatistics(organization_id:number,filter_data:any,search_text:any) {
        let parameters=[]
        parameters.push(organization_id)
        let query =`SELECT
                COUNT(DISTINCT pft.client_id) as total_client_count,
                SUM(CASE WHEN  pft.is_email_sent = 1 THEN 1 ELSE 0 END )  as total_email_sent,
                SUM(CASE WHEN  pft.email_url IS NOT NULL THEN 1 ELSE 0 END )  as total_email_received,
                SUM(CASE WHEN  pft.pdf_url IS NOT NULL THEN 1 ELSE 0 END )  as total_pdf_generated_count
                FROM pre_trade_proofs pft
                WHERE pft.organization_id = ?`;

        // filter_data && filter_data.is_email_received ? query+=" AND ptp.is_email_received = 1 ":"";

       // search_text !== undefined && search_text !== null && search_text !== "" ? (query+="  AND  client_name LIKE ?  ", parameters.push('%' + search_text + '%')):""

        query+=` GROUP BY pft.organization_id `;

        return await this._executeQuery(query, parameters)
    }

    async fetchAllOrganizationDateProofsStatistics(organization_id:number,filter_data:any,search_text:any) {
        let parameters=[]
        parameters.push(organization_id)
        let query =`SELECT
                COUNT(DISTINCT pft.client_id) as day_total_client_count,
                SUM(CASE WHEN  pft.is_email_sent = 1 THEN 1 ELSE 0 END )  as day_total_email_sent,
                SUM(CASE WHEN  pft.email_url IS NOT NULL THEN 1 ELSE 0 END )  as day_total_email_received,
                SUM(CASE WHEN  pft.pdf_url IS NOT NULL THEN 1 ELSE 0 END )  as day_total_pdf_generated_count
                FROM pre_trade_proofs pft
                WHERE pft.organization_id = ?`;

        // filter_data && filter_data.is_email_received ? query+=" AND ptp.is_email_received = 1 ":"";


        if (filter_data && filter_data.start_date && filter_data.end_date) {
            query += ` AND DATE(pft.created_date) BETWEEN '${filter_data.start_date}' AND '${filter_data.end_date}' `;
        }
        // search_text !== undefined && search_text !== null && search_text !== "" ? (query+="  AND  client_name LIKE ?  ", parameters.push('%' + search_text + '%')):""

        query+=` GROUP BY pft.organization_id `;

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


    async fetch_trade_proof_details(pre_proof_id: number) {
        const query = `SELECT * FROM pre_trades WHERE pre_proof_id = ? `;
        return await this._executeQuery(query, [pre_proof_id]);
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
        pre_trade_proof_id, client_code ,created_date ,  CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pdf_url)as pdf_url,
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',email_url) as email_url
        FROM pre_trade_proofs`;
        return await this._executeQuery(query, []);
    }



    async fetch_all_trade_proof_urls_by_client_id(client_id:number) {
        const query = `select
        pre_trade_proof_id, client_code ,created_date ,  CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pdf_url)as pdf_url,
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',email_url) as email_url
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
