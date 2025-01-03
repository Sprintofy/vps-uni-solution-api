'use strict';
import mysql from 'mysql2/promise';
import { Pool, Connection } from 'mysql2/promise';
import CONFIGS from '../../config';

export default class connection {
    private static _instance: connection;
    poolConnection: Pool;
    connected: boolean = false;
    constructor() {
        this.poolConnection = mysql.createPool({
            ...CONFIGS.DATABASE.DB,
        });
        this.connect();
    }


    public static get instance(): connection {
        return this._instance || (this._instance = new this());
    }

    public static async getConnection(): Promise<Connection> {
        return this.instance.poolConnection.getConnection();
    }

    public static async execute_query(query: string, params: any): Promise<any> {
        const [rows] = await this.instance.poolConnection.query(query, params);
        return rows;
    }

    public static async execute_query_transaction(sqlClient: any, query: string, params: any): Promise<any> {
        const [rows] = await sqlClient.query(query, params);
        return rows;
    }

    public static async begin_transaction(sqlClient: any): Promise<void> {
        await sqlClient.beginTransaction();
    }

    public static async commit_transaction(sqlClient: any): Promise<void> {
        await sqlClient.commit();
    }

    public static async rollback_transaction(sqlClient: any): Promise<void> {
        await sqlClient.rollback();
    }

    public static releaseConnection(sqlClient: any): void {
        return sqlClient.release();
    }

    private async connect(): Promise<void> {
        try {
            const connection = await this.poolConnection.getConnection();
            console.log("Connected to DB")
            this.connected = true;
            connection.release();
        } catch (error) {
            this.connected = false;
            console.error('Failed to connect to the database:', error);
        }
    }
}
