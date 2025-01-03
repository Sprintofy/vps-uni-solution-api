'use strict';
import BaseModel from "./dbConnection/base.model";

class rbacOrganizationModel extends BaseModel {
    constructor() {
        super();
    }

    async fetchAllOrganizations(searchText: any, limit: any, offset: any, sort: any) {
        let parameters = [];
        let query = `
            SELECT o.organization_id, o.organization_name, o.organization_email, o.organization_phone, o.organization_description, o.status,  ot.organization_type_name
            FROM  organizations o
            LEFT JOIN organization_types ot
            ON o.organization_type = ot.organization_type_id`;

        if (searchText) {
            query += " WHERE o.organization_name LIKE ? ";
            parameters.push('%' + searchText + '%');
        }

        if (sort && sort.key && sort.order) {
            query += ` ORDER BY o.${sort.key} ${sort.order}`;
        } else {
            query += " ORDER BY o.organization_id ASC";
        }

        query += " LIMIT ? OFFSET ?";
        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters);
    }

    async fetchAllOrganizationsTotal(searchText: any) {
        let parameters = [];
        let query = `
            SELECT COUNT(o.organization_id) AS total 
            FROM organizations o
            LEFT JOIN organization_types ot ON o.organization_type = ot.organization_type_id
        `;

        if (searchText) {
            query += " WHERE o.organization_name LIKE ? ";
            parameters.push('%' + searchText + '%');
        }
        return await this._executeQuery(query, parameters);
    }

    async fetchOrganizationById(organizationId: number) {
        const query = `
            SELECT o.organization_id, o.organization_name, o.organization_email, o.organization_phone, o.organization_description, o.status, ot.organization_type_id
            FROM organizations o
            LEFT JOIN organization_types ot ON o.organization_type = ot.organization_type_id
            WHERE o.organization_id = ?;
        `;

        return await this._executeQuery(query, [organizationId]);
    }

    async fetchOrgPagePermissions(orgId: any) {
        const query = `SELECT rp.page_id, rp.page_name, rp.page_label, rp.page_path, rp.parent_id
                   FROM rbac_organization_page_permission rop
                   LEFT JOIN rbac_pages rp ON rp.page_id = rop.page_id 
                   WHERE rop.organization_id = ?`;
        return await this._executeQuery(query, [orgId]);
    }

    async fetchOrgCtaPermissions(orgId: any) {
        const query = `SELECT rcp.page_cta_id, cta.cta_label, cta.cta_path, cta.page_id 
                   FROM rbac_organization_cta_permission rcp
                   LEFT JOIN rbac_page_cta cta ON cta.page_cta_id = rcp.page_cta_id
                   WHERE rcp.organization_id = ?`;
        return await this._executeQuery(query, [orgId]);
    }

    async saveTenant(data: any) {
        const query = "INSERT INTO organizations SET ? ;"
        return await this._executeQuery(query, [data]);
    }

    async saveTenantWithTransaction(sqlConnection: any, data: any) {
        const query = "INSERT INTO organizations SET ? ;"
        return await this._executeQueryTransaction(sqlConnection, query, [data]);
    }

    async updateTenant(data: any, organization_id: number) {
        const query = "UPDATE organizations SET ? WHERE organization_id = ? ;"
        return await this._executeQuery(query, [data, organization_id]);
    }

    async updateTenantWithTransaction(sqlConnection: any, data: any, organization_id: number) {
        const query = "UPDATE organizations SET ? WHERE organization_id = ? ;"
        return await this._executeQueryTransaction(sqlConnection, query, [data, organization_id]);
    }
}

export default new rbacOrganizationModel()
