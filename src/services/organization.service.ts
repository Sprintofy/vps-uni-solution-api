'use strict';
import organizationModel from '../models/organization.model'
import rbacService from './rbac.service';
import userModel from '../models/user.model';
import roleService from './rbacRole.service';
import userService from './user.service';
import branchService from './segments.service'
import rbacModel from '../models/rbac.model';
import { buildNavigationStructure } from '../utilities/navigationUtils';

/*************** Services ***********/

const fetchAllOrganizations = async (req: any) => {
    try {
        const { query, pageSize, pageIndex, sort } = req.body;
        const organizationsList = await organizationModel.fetchAllOrganizations(query || "", pageSize, (pageIndex - 1) * pageSize, sort || "");
        const totalRecords = await organizationModel.fetchAllOrganizationsTotal(query || "");

        return {
            data: organizationsList,
            total: totalRecords[0].total
        };
    } catch (error: any) {
        throw new Error(`Error fetching organizations: ${error.message}`);
    }
};

const fetchOrganizationById = async (req: any) => {
    try {
        console.log("req", req.query)
        const result = await organizationModel.fetchOrganizationById(req.query.organization_id);
        if (!result.length) throw new Error("No organization found");
        return result[0];
    } catch (error: any) {
        throw new Error(`Error fetching organization by ID: ${error.message}`);
    }
};

const fetchOrgRbacDetailsById = async (req: any): Promise<any> => {
    try {
        const organization_id = req.query;

        // Fetch all pages and CTAs
        const allPages = await rbacModel.fetchAllPages();
        const allCtas = await rbacModel.fetchAllCtas();

        const orgPages = await organizationModel.fetchOrgPagePermissions(organization_id);

        const orgCtas = await organizationModel.fetchOrgCtaPermissions(organization_id);

        const orgAccess: any[] = [];
        const ctaLookup: any = {};

        // Build a lookup for CTAs related to this organization
        orgCtas.forEach((cta: any) => {
            ctaLookup[cta.page_id] = ctaLookup[cta.page_id] || {};
            ctaLookup[cta.page_id][cta.page_cta_id] = true; // Mark CTA as accessible
        });

        // Sort pages by parent_id for a hierarchical structure
        const sortedPages = allPages.sort((a: any, b: any) => a.parent_id - b.parent_id);

        // Use the reusable function to build the organization navigation structure
        buildNavigationStructure(orgAccess, sortedPages, orgPages, allCtas, ctaLookup);

        return {
            org_access: orgAccess
        };
    } catch (error: any) {
        throw new Error(`Error fetching organization details: ${error.message}`);
    }
};

const saveOrganizationWithDefaultPermission = async (req: any) => {
    const sqlTransaction = await userModel._getConnection();
    try {

        await userModel._beginTransaction(sqlTransaction);

        // save default page and there Cta Permission to tenant
        req.body.organization_id = await saveOrganizationAndPermissionWithTransaction(sqlTransaction, req);

        console.log(" req.body.organization_id", req.body.organization_id)

        // save default tenant role  and permission
        req.body.role_id = await roleService.saveDefaultOrganizationRolePermissionWithTransaction(sqlTransaction, req);

        console.log(" req.body.role_id", req.body.role_id)
        // save user details and user permission
        req.body.user_id = await userService.saveUserNPermissionWithTransaction(sqlTransaction, req);

        console.log(" req.body.user_id", req.body.user_id)

        // save tenant default lab
        req.body.branch_id = await branchService.saveDefaultOrganizationBranchWithTransaction(sqlTransaction, req);

        // save user and labs mapping
        await branchService.saveUserBranchMappingWithTransaction(sqlTransaction, req);

        // todo Send Welcome Email and Password notification

        // Transaction commit
        await userModel._commitTransaction(sqlTransaction);
        await userModel._releaseConnection(sqlTransaction);

    } catch (error: any) {
        // Transaction Rollback
        console.error(`Failed to Save tenant: ${error.message}`);
        await userModel._rollbackTransaction(sqlTransaction);
        await userModel._releaseConnection(sqlTransaction);
        throw error;
    }
}

const saveOrganizationAndPermissionWithTransaction = async (sqlConnection: any, req: any): Promise<any> => {
    try {
        // save organization
        const organization = await saveOrganizationWithTransaction(sqlConnection, req);

        req.body.organization_id = organization.insertId;

        // save tenant permission
        await rbacService.saveDefaultOrganizationAndPermission(sqlConnection, req);

        return organization.insertId;

    } catch (error: any) {
        console.error(`Failed to fetch tenant: ${error.message}`);
        throw error;
    }
}


/*************** MYSQL CURD Services ***********/

const saveOrganization = async (req: any): Promise<any> => {
    try {
        const data = {} as any;

        const body = req.body.organization_information ? req.body.organization_information : req.body;

        if (body.organization_name) data.organization_name = body.organization_name;
        if (body.organization_email) data.organization_email = body.organization_email;
        if (body.organization_phone) data.organization_phone = body.organization_phone;
        if (body.organization_type) data.organization_type = body.organization_type;
        if (body.organization_description) data.organization_description = body.organization_description;

        if (req.user && req.user.user_id) { data.created_by = req.user.user_id; data.updated_by = req.user.user_id };

        return await organizationModel.saveTenant(data);
    } catch (error: any) {
        console.error(`Failed to save tenant: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}

const saveOrganizationWithTransaction = async (sqlConnection: any, req: any): Promise<any> => {
    try {
        const data = {} as any;

        const body = req.body.organization_information ? req.body.organization_information : req.body;

        if (body.organization_name) data.organization_name = body.organization_name;
        if (body.organization_email) data.organization_email = body.organization_email;
        if (body.organization_phone) data.organization_phone = body.organization_phone;
        if (body.organization_type) data.organization_type = body.organization_type;
        if (body.organization_description) data.organization_description = body.organization_description;

        if (req.user && req.user.user_id) { data.created_by = req.user.user_id; data.updated_by = req.user.user_id };

        return await organizationModel.saveTenantWithTransaction(sqlConnection, data);

    } catch (error: any) {
        console.error(`Failed to save Organization: ${error.message}`);
        throw new Error(`Failed to save Organization: ${error.message}`);
    }
}

const updateOrganization = async (req: any): Promise<any> => {
    try {

        const data = {} as any;

        const body = req.body.organization_information ? req.body.organization_information : req.body;

        if (body.organization_name) data.organization_name = body.organization_name;
        if (body.organization_email) data.organization_email = body.organization_email;
        if (body.organization_phone) data.organization_phone = body.organization_phone;
        if (body.organization_type) data.organization_type = body.organization_type;
        if (body.organization_description) data.organization_description = body.organization_description;

        if (req.user && req.user.user_id) { data.created_by = req.user.user_id; data.updated_by = req.user.user_id };

        await organizationModel.updateTenant(data, req.body.organization_id);

        return data;

    } catch (error: any) {
        console.error(`Failed to update Organization: ${error.message}`);
        throw new Error(`Failed to update Organization: ${error.message}`);
    }
}

const deleteTenant = async (req: any): Promise<any> => {
    try {
        const data = { status: 0, updated_by: req.user && req.user.user_id ? req.user.user_id : 0 };
        await organizationModel.updateTenant(data, req.params.organization_id);
        return data;

    } catch (error: any) {
        console.error(`Failed to delete tenant: ${error.message}`);
        throw new Error(`Failed to delete tenant: ${error.message}`);
    }
}

export default {
    fetchAllOrganizations,
    fetchOrganizationById,
    fetchOrgRbacDetailsById,
    saveOrganizationWithDefaultPermission,
    saveOrganizationWithTransaction,

    /***** Mysql Curd Services******/
    saveOrganization,
    updateOrganization,
    deleteTenant
}
