'use strict';
import mysql from './dbConnection';
import { Connection } from 'mysql2/promise';

class BaseModel {
    constructor() {}

    async _executeQuery(query: string, params: Array<any>) {
        return await mysql.execute_query(query, params);
    }

    async _getConnection(): Promise<Connection> {
        return await mysql.getConnection();
    }

    async _executeQueryTransaction(sqlConnection: Connection, query: string, params: Array<any>) {
        return await mysql.execute_query_transaction(sqlConnection, query, params);
    }

    async _beginTransaction(sqlConnection: Connection) {
        return await mysql.begin_transaction(sqlConnection);
    }

    async _commitTransaction(sqlConnection: Connection) {
        return await mysql.commit_transaction(sqlConnection);
    }

    async _rollbackTransaction(sqlConnection: Connection) {
        return await mysql.rollback_transaction(sqlConnection);
    }

    async _releaseConnection(sqlConnection: Connection) {
        return await mysql.releaseConnection(sqlConnection);
    }
}

export default BaseModel;
