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

    async findUserById(userId: any) {
        const query = `SELECT u.user_id, u.first_name, u.middle_name, u.last_name, u.mobile, u.email, u.organization_id, u.status, r.role_id, r.role_name 
        FROM users u
        LEFT JOIN rbac_roles r ON r.role_id = u.role_id
        WHERE u.user_id = ?;`;
        return await this._executeQuery(query, [userId]);
    }

    async fetchAllRolesDropdown() {
        let query = `SELECT role_id, role_name FROM rbac_roles ORDER BY role_name ASC`;
        return await this._executeQuery(query, []);
    }

    async fetchUserPageNCtaPermissions(userId: any, pageSize: number, offset: number): Promise<any> {
        const query = `
            SELECT 
                rbac_pages.page_id AS page_id,
                rbac_pages.page_label AS page_label,
                rbac_pages.page_icon AS page_icon,
                CASE 
                    WHEN rup.page_id IS NOT NULL THEN true 
                    ELSE false 
                END AS checked,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'page_id', sub_pages.page_id, 
                        'page_label', sub_pages.page_label, 
                        'page_icon', sub_pages.page_icon, 
                        'checked', CASE 
                                        WHEN srup.page_id IS NOT NULL THEN true 
                                        ELSE false 
                                    END,
                        'ctas', IFNULL(
                            (SELECT 
                                JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'page_cta_id', rcta.page_cta_id, 
                                        'cta_label', rcta.cta_label, 
                                        'page_id', rcta.page_id,
                                        'checked', CASE 
                                                        WHEN ucta.page_id IS NOT NULL AND ucta.user_id = ${userId} AND ucta.status = 1 THEN true 
                                                        ELSE false 
                                                    END
                                    )
                                )
                                FROM rbac_page_cta rcta 
                                LEFT JOIN rbac_user_cta_permission ucta 
                                ON rcta.page_id = sub_pages.page_id 
                                AND rcta.page_cta_id = ucta.page_cta_id 
                                AND ucta.status = 1
                                AND ucta.user_id = ${userId}
                                WHERE rcta.page_id = sub_pages.page_id
                            ), 
                            JSON_ARRAY()
                        )
                    )
                ) AS sub_pages
            FROM rbac_pages
            LEFT JOIN rbac_pages AS sub_pages
            ON sub_pages.parent_id = rbac_pages.page_id
            LEFT JOIN rbac_user_page_permission rup 
            ON rbac_pages.page_id = rup.page_id AND rup.user_id = ${userId} AND rup.status = 1
            LEFT JOIN rbac_user_page_permission srup 
            ON sub_pages.page_id = srup.page_id AND srup.user_id = ${userId} AND srup.status = 1
            WHERE rbac_pages.parent_id = 0
            GROUP BY rbac_pages.page_id, rbac_pages.page_label, rbac_pages.page_icon, rup.page_id 
            LIMIT ? OFFSET ?;
        `;

        const params = [pageSize, offset];

        return await this._executeQuery(query, params);
    }

    async fetchPagePermissionsCount() {
        let query = `SELECT COUNT(*) AS page_count FROM rbac_pages WHERE parent_id = 0 AND status = 1;`;
        return await this._executeQuery(query, []);
    }

}

export default new UserModel()
