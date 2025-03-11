'use strict';
import BaseModel from "./dbConnection/base.model";

class StockModel extends BaseModel {
    constructor() {
        super();
    }

    async fetch_active_stock() {
        let query =`SELECT * FROM stock_master  WHERE status = 1`;
        return await this._executeQuery(query, [])
    }


    async fetchAllStocksWithPagignation(organization_id:number,searchText:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        let query =`SELECT * FROM stock_master `;
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  WHERE script_name LIKE ? ", parameters.push('%' + searchText + '%')):""
        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += ""
        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters)
    }

    async fetchAllStockCount(organization_id:number ,searchText:any) {
        let parameters=[]
        let query = `SELECT COUNT(*) as total FROM stock_master  `;
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  WHERE  stock_name LIKE ?  ", parameters.push('%' + searchText + '%')):""
        return await this._executeQuery(query, parameters)
    }

    async fetchStocksInfoByIds(ids: any,organization_id:number) {
        const query = `SELECT * FROM clients 
        WHERE client_code IN (?)
        AND organization_id = ?;`;
        return await this._executeQuery(query, [ids,organization_id]);
    }

    async softDeleteStock(id: number) {
        let query = `UPDATE stock_master SET status = 0 WHERE stock_id = ?`;
        return await this._executeQuery(query, [id]);
    }

    async saveStock(data: any) {
        console.log("inside model ",data)
        const query = `INSERT INTO stock_master SET ? ;`;
        return await this._executeQuery(query, [data]);
    }


}

export default new StockModel()
