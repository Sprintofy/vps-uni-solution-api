'use strict';
import BaseModel from "./dbConnection/base.model";

class UserModel extends BaseModel {
    constructor() {
        super();
    }

    // Fetch user information by email
    async fetchUserInfoByEmail(email: string) {
        return await this._executeQuery("SELECT user_id, first_name, middle_name, last_name, CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name) AS userName, mobile, email, password, role_id, registered_date, is_new, status FROM users WHERE email = ?;", [email]);
    }

    // Fetch user information by user ID
    async fetchUserInfoByUserId(user_id: number) {
        const query = "SELECT CONCAT(u.first_name, ' ', u.middle_name, ' ', u.last_name) AS full_name, u.user_id, u.first_name, u.middle_name, u.mobile, u.email, u.role_id FROM users u WHERE u.user_id = ?;";
        return await this._executeQuery(query, [user_id]);
    }


    /*********** CURD MODEL *************/

    async saveUser(data: any) {
        const query = "INSERT INTO users SET ? ;"
        return await this._executeQuery(query, [data]);
    }

    async emailExists(email: string) {
        const query = "SELECT COUNT(*) as count FROM users WHERE email = ?;";
        const result = await this._executeQuery(query, [email]);
        console.log("result", result, result[0].count > 0)
        return result[0].count > 0;
    }

    async saveUserWithTransaction(sqlConnection: any, data: any) {
        const query = "INSERT INTO users SET ? ;"
        return await this._executeQueryTransaction(sqlConnection, query, [data]);
    }

    async updateUser(data: any, user_id: number) {
        const query = "UPDATE users SET ? WHERE user_id = ? ;";
        return await this._executeQuery(query, [data, user_id]);
    }

    async updateUserWithTransaction(sqlConnection: any, data: any, user_id: number) {
        const query = "UPDATE users SET ? WHERE user_id = ? ;";
        return await this._executeQueryTransaction(sqlConnection, query, [data, user_id]);
    }

    async fetchAllUsers(searchText: string, limit: number, offset: number, sort: { key: string, order: string }) {
        let parameters = [];
        let query = `SELECT user_id, first_name, middle_name, last_name, mobile, email, role_id, organization_id, registered_date, status, created_by, updated_by, created_date, updated_date FROM users`;

        if (searchText) {
            query += " WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?";
            parameters.push('%' + searchText + '%', '%' + searchText + '%', '%' + searchText + '%');
        }

        if (sort && sort.key && sort.order) {
            query += ` ORDER BY ${sort.key} ${sort.order}`;
        } else {
            query += " ORDER BY user_id ASC";
        }

        query += " LIMIT ? OFFSET ?";
        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters);
    }

    async fetchAllUsersTotal(searchText: string) {
        let parameters = [];
        let query = `SELECT COUNT(user_id) AS total FROM users`;

        if (searchText) {
            query += " WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?";
            parameters.push('%' + searchText + '%', '%' + searchText + '%', '%' + searchText + '%');
        }

        return await this._executeQuery(query, parameters);
    }

}

export default new UserModel()
