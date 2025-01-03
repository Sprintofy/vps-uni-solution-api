'use strict';
import roleModel from '../models/role.model'
import rbacService from '../services/rbac.service';

/*************** Services ***********/

const saveDefaultOrganizationRolePermissionWithTransaction = async (sqlConnection:any,req: any): Promise<any> => {
    try {

        // fetch default role
        const roles = await roleModel.fetchActiveDefaultRoles();

        const rolePromises = roles.map(async (role: any) => {
            const data = {
                organization_id: req.body.organization_id,
                role_name: role.role_name,
                role_description: role.role_description,
            };

            const results = await roleModel.saveTenantRoleWithTransaction(sqlConnection, data);

            req.body.role_id = results.insertId;
            await rbacService.saveDefaultOrganizationRolePermission(sqlConnection,req);

        });

        await Promise.all(rolePromises);

        return req.body.role_id;

    } catch (error:any) {
        console.error(`Failed to save default role and permission: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}


/*************** MYSQL CURD Services ***********/

const saveRole = async (req: any): Promise<any> => {
    try {
        const data = {} as any;
        if(req.body.organization_id)data.organization_id = req.body.organization_id;
        if(req.body.role_name)data.role_name = req.body.role_name;
        if(req.body.role_description)data.role_description = req.body.role_description;
        if(req.body.is_default !== undefined) data.is_default = req.body.is_default;
        if(req.user && req.user.user_id) { data.created_by = req.user.user_id; data.update_by = req.user.user_id};
        await roleModel.saveTenantRole(data);
        return data;
    } catch (error:any) {
        console.error(`Failed to save tenant: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}

const saveRoleWithTransaction = async (sqlConnection:any,req: any): Promise<any> => {
    try {
        const data = {} as any;
        if(req.body.organization_id)data.organization_id = req.body.organization_id;
        if(req.body.role_name)data.role_name = req.body.role_name;
        if(req.body.role_description)data.role_description = req.body.role_description;
        if(req.body.is_default !== undefined) data.is_default = req.body.is_default;
        if(req.user && req.user.user_id) { data.created_by = req.user.user_id; data.update_by = req.user.user_id};
        return await roleModel.saveTenantRoleWithTransaction(sqlConnection,data);
    } catch (error:any) {
        console.error(`Failed to save tenant: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}

const updateRole = async (req: any): Promise<any> => {
    try {
        const data = {} as any;
        if(req.body.organization_id)data.organization_id = req.body.organization_id;
        if(req.body.role_name)data.role_name = req.body.role_name;
        if(req.body.role_description)data.role_description = req.body.role_description;
        if(req.body.status !== undefined) data.status = req.body.status;
        if(req.body.is_default !== undefined) data.is_default = req.body.is_default;
        if(req.user && req.user.user_id)data.updated_by = req.user.user_id;
        await roleModel.updateTenantRole(data, req.body.organization_id);
        return data;
    } catch (error:any) {
        console.error(`Failed to update tenant: ${error.message}`);
        throw new Error(`Failed to update tenant: ${error.message}`);
    }
}

const deleteRole = async (req: any): Promise<any> => {
    try {
        const data = {status:0, updated_by: req.user && req.user.user_id ? req.user.user_id : 0 };
        await roleModel.updateTenantRole(data,req.params.organization_id);
        return data;
    } catch (error:any) {
        console.error(`Failed to delete tenant: ${error.message}`);
        throw new Error(`Failed to delete tenant: ${error.message}`);
    }
}

export default {
    saveDefaultOrganizationRolePermissionWithTransaction: saveDefaultOrganizationRolePermissionWithTransaction,

    /************* MYSQL CURD Service *************/
    saveRole: saveRole,
    updateRole: updateRole,
    deleteRole: deleteRole
}
