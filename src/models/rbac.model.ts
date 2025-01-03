'use strict';
import BaseModel from "./dbConnection/base.model";

class rbacModel extends BaseModel {
    constructor() {
        super();
    }

    /************* rbac tenant Role Permission ************************/

    async saveTenantPagePermissionWithTransaction(sqlConnection: any, organization_id: any) {
        const query = `INSERT INTO rbac_organization_page_permission(organization_id,page_id,status)
        SELECT ${organization_id},page_id ,1
        FROM rbac_pages
        WHERE status = 1 AND is_default = 1 ;`;
        return await this._executeQueryTransaction(sqlConnection, query, []);
    }

    async saveTenantPageCtaPermissionWithTransaction(sqlConnection: any, organization_id: any) {
        const query = `INSERT INTO rbac_organization_cta_permission(organization_id,page_id,page_cta_id,status)
        SELECT ${organization_id},page_id ,page_cta_id,1
        FROM rbac_page_cta
        WHERE status = 1 AND is_default = 1 ;`;
        return await this._executeQueryTransaction(sqlConnection, query, []);
    }

    /************* rbac Tenant Role Permission ************************/

    async saveRolePagePermissionWithTransaction(sqlConnection: any, role_id: any, organization_id: any) {
        const query = `INSERT INTO rbac_role_page_permission(organization_id,role_id,page_id,status)
        SELECT ${organization_id},${role_id},page_id ,1
        FROM rbac_pages
        WHERE status = 1 AND is_default = 1 ;`;
        return await this._executeQueryTransaction(sqlConnection, query, []);
    }

    async saveRolePageCtaPermissionWithTransaction(sqlConnection: any, role_id: any, organization_id: any) {
        const query = `INSERT INTO rbac_role_cta_permission(organization_id,role_id,page_id,page_cta_id,status)
        SELECT ${organization_id},${role_id},page_id ,page_cta_id,1
        FROM rbac_page_cta
        WHERE status = 1 AND is_default = 1 ;`;
        return await this._executeQueryTransaction(sqlConnection, query, []);
    }

    /************* rbac User Role Permission ************************/

    async saveUserPagePermissionWithTransaction(sqlConnection: any, user_id: any, role_id: any, organization_id: any) {
        const query = `INSERT INTO rbac_user_page_permission(organization_id,user_id,page_id,status)
        SELECT ${organization_id},${user_id},page_id ,1
        FROM rbac_pages
        WHERE status = 1 AND is_default = 1 ;`;
        return await this._executeQueryTransaction(sqlConnection, query, []);
    }

    async saveUserPageCtaPermissionWithTransaction(sqlConnection: any, user_id: any, role_id: any, organization_id: any) {
        const query = `INSERT INTO rbac_user_cta_permission(organization_id,user_id,page_id,page_cta_id,status)
        SELECT ${organization_id},${user_id},page_id ,page_cta_id,1
        FROM rbac_page_cta
        WHERE status = 1 AND is_default = 1 ;`;
        return await this._executeQueryTransaction(sqlConnection, query, []);
    }

    // Code in use
    async fetchUserPagePermission(user_id: any, organization_id: any, status: number) {
        const query = `SELECT 
        ru.rbac_user_page_permission_id, ru.organization_id, ru.user_id, ru.page_id, rp.page_name, rp.page_label, rp.page_path, rp.parent_id, rp.page_icon, rp.is_default, ru.status
        FROM rbac_user_page_permission ru
        LEFT JOIN rbac_pages rp ON rp.page_id = ru.page_id 
        WHERE ru.user_id = ?
        AND ru.status = ? ;`;
        return await this._executeQuery(query, [user_id, status]);
    }

    async fetchUserCtaPermission(user_id: any, organization_id: any, status: number) {
        const query = `SELECT ruc.rbac_user_cta_permission_id,ruc.organization_id,ruc.user_id,
        ruc.page_id,ruc.page_cta_id,rcp.cta_label, rcp.cta_path,rcp.is_default,ruc.status
        FROM rbac_user_cta_permission ruc
        LEFT JOIN rbac_page_cta rcp ON rcp.page_cta_id = ruc.page_cta_id
        WHERE ruc.user_id= ? 
        AND ruc.status = ? ;`;
        return await this._executeQuery(query, [user_id, status]);
    }

    async fetchAllPages() {
        const query = `SELECT page_id, page_name, page_label, page_path, parent_id, page_icon FROM rbac_pages`;
        return await this._executeQuery(query, []);
    }

    async fetchAllCtas() {
        const query = `SELECT page_cta_id, cta_label, cta_path, page_id FROM rbac_page_cta`;
        return await this._executeQuery(query, []);
    }

    async findRoleById(roleId: any) {
        const query = `SELECT role_id, role_name, role_description, status FROM rbac_roles WHERE role_id = ?`;
        return await this._executeQuery(query, [roleId]);
    }

    async fetchRolePagePermissions(roleId: any) {
        const query = `SELECT rp.page_id, rp.page_name, rp.page_label, rp.page_path, rp.parent_id
            FROM rbac_role_page_permission rpp
            LEFT JOIN rbac_pages rp ON rp.page_id = rpp.page_id 
            WHERE rpp.role_id = ?`;
        return await this._executeQuery(query, [roleId]);
    }

    async fetchRoleCtaPermissions(roleId: any) {
        const query = `SELECT rcp.page_cta_id, cta.cta_label, cta.cta_path, cta.page_id 
            FROM rbac_role_cta_permission rcp
            LEFT JOIN rbac_page_cta cta ON cta.page_cta_id = rcp.page_cta_id
            WHERE rcp.role_id = ?`;
        return await this._executeQuery(query, [roleId]);
    }

    async fetchAllRbacRoles(searchText: any, limit: any, offset: any, sort: any) {
        let parameters = [];
        let query = `SELECT role_id, role_name, role_description, is_default, status, created_by, updated_by, created_date, updated_date FROM rbac_roles`;
        if (searchText) {
            query += " WHERE role_name LIKE ? ";
            parameters.push('%' + searchText + '%');
        }
        if (sort && sort.key && sort.order) {
            query += ` ORDER BY ${sort.key} ${sort.order}`;
        } else {
            query += " ORDER BY role_id ASC";
        }
        query += " LIMIT ? OFFSET ?";
        parameters.push(limit, offset);
        return await this._executeQuery(query, parameters);
    }

    async fetchAllRbacRolesTotal(searchText: any) {
        let parameters = [];
        let query = `SELECT COUNT(role_id) AS total FROM rbac_roles`;
        if (searchText) {
            query += " WHERE role_name LIKE ? ";
            parameters.push('%' + searchText + '%');
        }
        return await this._executeQuery(query, parameters);
    }

    async fetchPageById(page_id: number) {
        const query = "SELECT * FROM rbac_pages WHERE page_id = ?";
        return await this._executeQuery(query, [page_id]);
    }



    async insertNewRole(role_name: string) {
        const query = "INSERT INTO rbac_roles (role_name, status) VALUES (?, 1)";
        const result = await this._executeQuery(query, [role_name]);
        return result.insertId; // Return the ID of the newly created role
    }

    async assignPagePermissionToRole(organization_id: number, roleId: number, pageId: number) {
        const query = "INSERT INTO rbac_role_page_permission (organization_id, role_id, page_id, status) VALUES (?, ?, ?, 1)";
        await this._executeQuery(query, [organization_id, roleId, pageId]);
    }

    async assignCtaPermissionToRole(organization_id: number, roleId: number, pageCtaId: number, pageId: number) {
        const query = "INSERT INTO rbac_role_cta_permission (organization_id, role_id, page_cta_id, page_id, status) VALUES (?, ?, ?, ?, 1)";
        await this._executeQuery(query, [organization_id, roleId, pageCtaId, pageId]);
    }

    async deleteRbacRole(status: any, role_id: number) {
        const query = "UPDATE rbac_roles SET status = ? WHERE role_id = ?;";
        const result = await this._executeQuery(query, [status, role_id]);
        return result
    }



}



export default new rbacModel()
