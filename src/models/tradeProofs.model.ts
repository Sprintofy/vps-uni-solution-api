'use strict';
import BaseModel from "./dbConnection/base.model";
import CONFIGS from "../config";

class TradeProofsModel extends BaseModel {
    constructor() {
        super();
    }

    async fetch_all_clients_proofs(client_id:number,filter_data:any,search_text:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(client_id)
        let query =`SELECT pft.pre_trade_proof_id, pft.client_id, pft.client_code,pft.organization_id, 
                pft.is_email_sent,
                CASE WHEN pft.email_url IS NOT NULL THEN 1 ELSE 0 END as is_email_received, 
                CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pft.email_url) as email_url, pft.email_proof, CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pft.pdf_url)as pdf_url, 
                pft.email_response, pft.status, pft.created_by, pft.updated_by,DATE_FORMAT(pft.created_date, '%Y-%m-%d') as created_date  , pft.updated_date,
                NULL AS include_stocks
                FROM pre_trade_proofs pft
                LEFT JOIN pre_trades pt ON pt.pre_proof_id = pft.pre_trade_proof_id
                WHERE pft.client_id =  ? `;

        search_text !== undefined && search_text !== null && search_text !== "" ? (query+=" AND ( pt.client_code LIKE ? || pt.script_name LIKE ? ) ", parameters.push('%' + search_text + '%','%' + search_text + '%')):""

        query += " GROUP BY pft.pre_trade_proof_id ";

        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += " ORDER BY  pft.created_date DESC"


        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);
        console.log(query)
        return await this._executeQuery(query, parameters)
    }

    async fetch_all_clients_proofs_include_stock(client_id:number,filter_data:any,search_text:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(client_id)
        let query =`SELECT pft.pre_trade_proof_id, pft.client_id, pft.client_code,pt.script_name, pt.buy_or_sell
                FROM pre_trade_proofs pft
                LEFT JOIN pre_trades pt ON pt.pre_proof_id = pft.pre_trade_proof_id
                WHERE pft.client_id =  ? `;
        console.log(query)
        return await this._executeQuery(query, parameters)
    }

    async fetch_all_clients_proofs_count(client_id:number ,filter_data:any,search_text:any) {
        let parameters=[]
        parameters.push(client_id)
        let query =`SELECT COUNT(DISTINCT pft.pre_trade_proof_id) as total
                FROM pre_trade_proofs pft
                LEFT JOIN pre_trades pt ON pt.pre_proof_id = pft.pre_trade_proof_id
                WHERE pt.client_id =  ? `
        search_text !== undefined && search_text !== null && search_text !== "" ? (query+=" AND ( pt.client_code LIKE ? || pt.script_name LIKE ? ) ", parameters.push('%' + search_text + '%','%' + search_text + '%')):""

        return await this._executeQuery(query, parameters)
    }

    async fetch_all_clients_proofs_statistics(client_id:number,filter_data:any,search_text:any) {
        let parameters=[]
        parameters.push(client_id)
        let query =`SELECT 
                pft.client_id,
                pt.total_trade_count,
                SUM(CASE WHEN  pft.is_email_sent = 1 THEN 1 ELSE 0 END )  as total_email_sent,
                SUM(CASE WHEN  pft.email_url IS NOT NULL THEN 1 ELSE 0 END )  as total_email_received,
                SUM(CASE WHEN  pft.pdf_url IS NOT NULL THEN 1 ELSE 0 END )  as total_pdf_generated_count
                FROM pre_trade_proofs pft
                LEFT JOIN ( SELECT COUNT(DISTINCT pt.pre_trade_id) as total_trade_count,pt.client_id
                            FROM pre_trades pt
                            WHERE pt.client_id = ${client_id}
                            GROUP BY pt.client_code
                          ) pt ON pt.client_id = pft.client_id
                WHERE pft.client_id =  ?
                GROUP BY pft.client_id,pt.total_trade_count `;

       // search_text !== undefined && search_text !== null && search_text !== "" ? (query+=" AND ( pft.client_code LIKE ? || pt.script_name LIKE ? ) ", parameters.push('%' + search_text + '%','%' + search_text + '%')):""

        return await this._executeQuery(query, parameters)
    }


    /***************** Pre Trades  *********************/

    async fetch_trade_by_client(client_id:number,filter_data:any,searchText:any,limit:any,offset:any,sort:any) {
        const query = `SELECT * FROM pre_trades WHERE client_id = ? `;
        return await this._executeQuery(query, [client_id]);
    }

    async fetch_trade_by_client_count(client_id:number ,filter_data:any,searchText:any) {
        const query = `SELECT COUNT(*) FROM pre_trades WHERE client_id = ? `;
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


    async getClientEmails(organization_id : number) {
        const query = `SELECT client_code, REPLACE(client_name, ' ', '-') AS client_name, email 
                       FROM clients  
                       WHERE organization_id = ?;
`;
        return await this._executeQuery(query, [organization_id]);
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
        FROM pre_trade_proofs
        WHERE client_id =  ? `;
        return await this._executeQuery(query, [client_is]);
    }


    async fetch_all_trade_proof_urls(organization_id:number,start_date:any,end_date:any) {
        let query = `SELECT ptp.pre_trade_proof_id, ptp.client_code ,ptp.created_date ,  
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',ptp.pdf_url)as pdf_url,
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',ptp.email_url)as email_url      
        FROM pre_trade_proofs ptp
        WHERE ptp.organization_id = ? `

        if (start_date && end_date) {
            query += ` AND DATE(ptp.created_date) BETWEEN '${start_date}' AND '${end_date}' `;
        }
        return await this._executeQuery(query, [organization_id]);
    }

    async fetch_all_trade_proof_urls_email(organization_id:number,start_date:any,end_date:any) {
        let query = `SELECT ptp.pre_trade_proof_id, ptp.client_code ,ptp.created_date ,  
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',ptp.pdf_url)as pdf_url,
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',ptp.email_url)as email_url      
        FROM pre_trade_proofs ptp
        WHERE ptp.organization_id = ?  AND email_url IS NOT NULL`

        if (start_date && end_date) {
            query += ` AND DATE(ptp.created_date) BETWEEN '${start_date}' AND '${end_date}' `;
        }
        return await this._executeQuery(query, [organization_id]);
    }

    async fetch_all_trade_proof_email_read(organization_id:number,date:any) {
        const query = `SELECT pre_trade_proof_id,c.client_id, c.client_code ,ptp.created_date,c.email as client_email
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    -- ptp.organization_id = ? 
                    ptp.is_email_received = 0
                    AND DATE(ptp.created_date) = ? `;
        return await this._executeQuery(query, [organization_id,date]);
    }

    async fetch_all_trade_proof_email_not_received(organization_id:number,date:any) {
        const query = `SELECT pre_trade_proof_id,c.client_id, c.client_code ,ptp.created_date,c.email as client_email
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    -- ptp.organization_id = ? 
                    ptp.is_email_received = 0
                    AND DATE(ptp.created_date) = ? `;
        return await this._executeQuery(query, [organization_id,date]);
    }

    async fetch_all_trade_proof_email_read_client_wise(organization_id:number,client_id:number,date:any) {
        const query = `SELECT pre_trade_proof_id,c.client_id, c.client_code ,ptp.created_date,c.email as client_email
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    -- ptp.organization_id = ? 
                    ptp.client_id = ? 
                    AND ptp.is_email_received = 0
                    AND DATE(ptp.created_date) = ? `;
        return await this._executeQuery(query, [organization_id,client_id,date]);
    }

    async fetch_trade_proof_Id(pre_trade_proof_id:number) {
        const query = `SELECT ptp.pre_trade_proof_id,c.client_id,
                    c.client_code ,ptp.created_date,c.email as client_email,
                    ptp.email_sample
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    ptp.is_email_sent = 0
                    AND ptp.pre_trade_proof_id = ? `;
        return await this._executeQuery(query, [pre_trade_proof_id]);
    }

    async fetch_trade_unread_proof_Id(pre_trade_proof_id:number) {
        const query = `SELECT ptp.pre_trade_proof_id,c.client_id,
                    c.client_code ,DATE_FORMAT(ptp.created_date, '%Y-%m-%d %H:%i:%s') AS formatted_date,ptp.created_date,c.email as client_email,
                    ptp.email_sample
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    ptp.is_email_received = 0
                    AND ptp.pre_trade_proof_id = ? `;
        return await this._executeQuery(query, [pre_trade_proof_id]);
    }

    async fetch_trade_proof_email(organization_id:number) {
        const query = `SELECT ptp.pre_trade_proof_id,c.client_id,
                    c.client_code ,ptp.created_date,c.email as client_email,
                    ptp.email_sample
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    ptp.is_email_sent = 0
                    AND ptp.organization_id = ? `;
        return await this._executeQuery(query, [organization_id]);
    }

    async fetch_resend_email_by_date(organization_id:number,date:any) {
        const query = `SELECT ptp.pre_trade_proof_id,c.client_id,
                    c.client_code ,ptp.created_date,c.email as client_email,
                    ptp.email_sample
                    FROM pre_trade_proofs ptp  
                    LEFT JOIN clients c ON c.client_id = ptp.client_id
                    WHERE 
                    ptp.is_email_sent = 0
                    AND ptp.organization_id = ?
                    AND DATE(ptp.created_date) = ? `;
        return await this._executeQuery(query, [organization_id,date]);
    }

    async fetch_all_trade_proof_urls_by_client_id(client_id:number) {
        const query = `SELECT pre_trade_proof_id, client_code ,created_date ,  
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',pdf_url)as pdf_url,
        CONCAT('${CONFIGS.AWS.S3.BASE_URL}',email_url)as email_url
        FROM pre_trade_proofs WHERE client_id = ?`;
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

export default new TradeProofsModel()
