'use strict';
import BaseModel from "./dbConnection/base.model";

class ClientTradeModel extends BaseModel {
    constructor() {
        super();
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
