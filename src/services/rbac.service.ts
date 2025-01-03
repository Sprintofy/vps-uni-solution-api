'use strict';
import rbacModel from '../models/rbac.model';
import rbacPageModel from '../models/rbacPage.model';
import rbacPageCtaModel from '../models/rbacPageCta.model';
import CONSTANTS from '../common/constants/constants';
import userModel from '../models/user.model';
import { buildNavigationStructure } from '../utilities/navigationUtils';

/********** Rbac Tenant Service *******************/

const saveDefaultOrganizationAndPermission = async (sqlConnection: any, req: any): Promise<any> => {
    try {

        // Tenant Page Permission
        await rbacModel.saveTenantPagePermissionWithTransaction(sqlConnection, req.body.organization_id);

        // Tenant Page CTA Permission
        await rbacModel.saveTenantPageCtaPermissionWithTransaction(sqlConnection, req.body.organization_id);

        return true;
    } catch (error: any) {
        console.error(`Failed to add Page And CTA Permission to  tenant: ${error.message}`);
        throw error;
    }
}

/********** Rbac Role Services *******************/

const saveDefaultOrganizationRolePermission = async (sqlConnection: any, req: any): Promise<any> => {
    try {
        console.log("saveDefaultTenantRolePermission", req.body);
        // Role Page Permission
        await rbacModel.saveRolePagePermissionWithTransaction(sqlConnection, req.body.role_id, req.body.organization_id);

        // Role Page CTA Permission
        await rbacModel.saveRolePageCtaPermissionWithTransaction(sqlConnection, req.body.role_id, req.body.organization_id);

        return true;

    } catch (error: any) {
        console.error(`Failed to save rbac role page & cta permission: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}

/********** Rbac User Services *******************/

const saveDefaultUserPermission = async (sqlConnection: any, req: any): Promise<any> => {
    try {
        console.log("saveDefaultTenantRolePermission", req.body);
        // Role Page Permission
        await rbacModel.saveUserPagePermissionWithTransaction(sqlConnection, req.body.user_id, req.body.role_id, req.body.organization_id);

        // Role Page CTA Permission
        await rbacModel.saveUserPageCtaPermissionWithTransaction(sqlConnection, req.body.user_id, req.body.role_id, req.body.organization_id);

        return true;
    } catch (error: any) {
        console.error(`Failed to save rbac user page & cta permission: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}

const fetchUserPageNCtaPermission = async (data: any): Promise<any> => {
    try {
        // page permission
        const permissions = await rbacModel.fetchUserPagePermission(data.user_id, data.organization_id, CONSTANTS.STATUS.ACTIVE);

        // page cta  permission
        const cta_permissions = await rbacModel.fetchUserCtaPermission(data.user_id, data.organization_id, CONSTANTS.STATUS.ACTIVE);

        const menu: any[] = [];
        const lookup = {} as any;
        const ctaLookup = {} as any;
        // Create a lookup object for all pages
        permissions.forEach((page: any) => {
            page.sub_menu = [];
            lookup[page.page_id] = page;
            if (page.parent_id === 0) {
                menu.push(page);
            }
        });

        // Create a lookup object for CTA permissions
        cta_permissions.forEach((cta: any) => {
            if (!ctaLookup[cta.page_id]) {
                ctaLookup[cta.page_id] = [];
            }
            ctaLookup[cta.page_id].push(cta);
        });

        // Populate the submenu for each parent page
        permissions.forEach((page: any) => {
            if (page.parent_id !== 0 && lookup[page.parent_id]) {
                lookup[page.parent_id].sub_menu.push(page);
            }
            if (ctaLookup[page.page_id]) {
                page.page_cta_permission = ctaLookup[page.page_id];
            }
        });

        return menu;
    } catch (error: any) {
        console.error(`Failed to fetch user page & cta permission: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}

const V1_fetchUserPageNCtaPermission = async (req: any): Promise<any> => {
    try {

        const user = await userModel.fetchUserInfoByUserId(req.query.user_id);
        if (!user.length) throw new Error("Invalid user");

        // Fetch page and CTA permissions
        const permissions = await rbacModel.fetchUserPagePermission(user[0].user_id, user[0].organization_id, CONSTANTS.STATUS.ACTIVE);
        const cta_permissions = await rbacModel.fetchUserCtaPermission(user[0].user_id, user[0].organization_id, CONSTANTS.STATUS.ACTIVE);

        const menu: any[] = [];
        const lookup: any = {};
        const ctaLookup: any = {};

        // Create a lookup object for all pages
        permissions.forEach((page: any) => {
            page.sub_menu = [];
            lookup[page.page_id] = page;
            if (page.parent_id === 0) {
                menu.push(page);
            }
        });

        // Create a lookup object for CTA permissions
        cta_permissions.forEach((cta: any) => {
            if (!ctaLookup[cta.page_id]) {
                ctaLookup[cta.page_id] = [];
            }
            ctaLookup[cta.page_id].push(cta);
        });

        // Populate the submenu and CTA permissions for each page
        permissions.forEach((page: any) => {
            if (page.parent_id !== 0 && lookup[page.parent_id]) {
                lookup[page.parent_id].sub_menu.push(page);
            }
            // Commented out this logic as it interferes with the page_permissions array.
            // if (ctaLookup[page.page_id]) {
            //     page.page_cta_permission = ctaLookup[page.page_id];
            // }
        });

        // Construct the page_cta_permissions object
        const page_cta_permissions: any = {};
        permissions.forEach((page: any) => {
            if (ctaLookup[page.page_id]) {
                page_cta_permissions[page.page_path] = ctaLookup[page.page_id].map((cta: any) => cta.cta_path);
            } else {
                page_cta_permissions[page.page_path] = [page.page_path];
            }
        });

        // const NAV_ITEM_TYPE_TITLE = CONSTANTS.NAVIGATION_CONSTANTS.NAV_ITEM_TYPE_TITLE
        const NAV_ITEM_TYPE_COLLAPSE = CONSTANTS.NAVIGATION_CONSTANTS.NAV_ITEM_TYPE_COLLAPSE
        const NAV_ITEM_TYPE_ITEM = CONSTANTS.NAVIGATION_CONSTANTS.NAV_ITEM_TYPE_ITEM
        const NAV_ADMIN = CONSTANTS.NAVIGATION_ROLES.ADMIN
        const NAV_USER = CONSTANTS.NAVIGATION_ROLES.USER

        // Construct the navigation response
        const navigationConfig =
            // [
            // {
            //     key: 'apps',
            //     path: '',
            //     title: ' ',
            //     translateKey: 'nav.apps',
            //     icon: 'apps',
            //     type: NAV_ITEM_TYPE_TITLE,
            //     authority: [NAV_ADMIN, NAV_USER],
            //     subMenu:
            menu.map((page, index) => ({
                key: `apps.menu${index}`,
                path: `${page.page_path}`,
                title: page.page_label,
                icon: page.page_icon || '',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: [NAV_ADMIN, NAV_USER],
                translateKey: `nav.${page.page_path.replace(/\//g, '')}.menu${index}`,
                subMenu: page.sub_menu.map((sub: any) => ({
                    key: `${page.page_path.replace(/\//g, '')}.${sub.page_path.replace(/\//g, '')}`,
                    path: sub.page_path,
                    title: sub.page_label,
                    icon: sub.page_icon || '',
                    type: NAV_ITEM_TYPE_ITEM,
                    authority: [NAV_ADMIN, NAV_USER],
                    translateKey: `nav.${sub.page_path.replace(/\//g, '')}`,
                    subMenu: sub.sub_menu || []
                }))
            }))
        //     }
        // ];

        return {
            page_cta_permissions,
            page_permissions: navigationConfig
        };
    } catch (error: any) {
        console.error(`Failed to fetch user page & cta permission: ${error.message}`);
        throw new Error(`Failed to fetch user page & cta permission: ${error.message}`);
    }
}

const fetchRolePermissionsDetailsById = async (req: any): Promise<any> => {
    try {
        const role_id = req.query.role_id;

        // Fetch all pages and CTAs
        const allPages = await rbacModel.fetchAllPages();
        const allCtas = await rbacModel.fetchAllCtas();

        const rolePages = await rbacModel.fetchRolePagePermissions(role_id);
        const roleCtas = await rbacModel.fetchRoleCtaPermissions(role_id);

        const roleAccess: any[] = [];
        const ctaLookup: any = {};

        // Build a lookup for CTAs related to this role
        roleCtas.forEach((cta: any) => {
            ctaLookup[cta.page_id] = ctaLookup[cta.page_id] || {};
            ctaLookup[cta.page_id][cta.page_cta_id] = true; // Indicates access
        });

        const sortedPages = allPages.sort((a: any, b: any) => a.parent_id - b.parent_id);

        buildNavigationStructure(roleAccess, sortedPages, rolePages, allCtas, ctaLookup);

        return {
            role_access: roleAccess
        };
    } catch (error: any) {
        throw new Error(`Error fetching role details: ${error.message}`);
    }
};

const fetchRoleDetailsById = async (req: any): Promise<any> => {
    try {
        const roleId = req.query.role_id;
        const roleDetails = await rbacModel.findRoleById(roleId);

        if (!roleDetails.length) throw new Error("Role not found");

        return roleDetails;
    } catch (error: any) {
        throw new Error(`Error fetching role details: ${error.message}`);
    }
};

const fetchAllRbacRoles = async (req: any) => {
    try {
        const { query, pageSize, pageIndex, sort } = req.body
        const rolesList = await rbacModel.fetchAllRbacRoles(query || "", pageSize, (pageIndex - 1) * pageSize, sort || "");
        const totalRecords = await rbacModel.fetchAllRbacRolesTotal(query || "");
        return {
            data: rolesList,
            total: totalRecords[0].total
        };
    } catch (error: any) {
        throw new Error(`Error fetching RBAC roles: ${error.message}`);
    }
};

const fetchAllPagesAndCtas = async (): Promise<any> => {
    try {
        // Fetch all pages and CTAs
        const allPages = await rbacModel.fetchAllPages();
        const allCtas = await rbacModel.fetchAllCtas();

        const roleAccess: any[] = [];
        const ctaLookup: any = {};

        // Create a lookup for CTAs
        allCtas.forEach((cta: any) => {
            ctaLookup[cta.page_id] = ctaLookup[cta.page_id] || {};
            ctaLookup[cta.page_id][cta.page_cta_id] = true; // Default to false
        });

        const sortedPages = allPages.sort((a: any, b: any) => a.parent_id - b.parent_id);

        // Build role access structure
        sortedPages.forEach((page: any) => {
            const parentEntry = {
                page_id: page.page_id,
                page_label: page.page_label,
                page_icon: page.page_icon,
                page_path: page.page_path,
                checked: true, // Default to false
                sub_pages: []
            };

            if (page.parent_id === 0) {
                roleAccess.push(parentEntry);
            } else {
                const parentPage = roleAccess.find(p => p.page_id == page.parent_id);

                if (parentPage) {
                    const childEntry = {
                        page_id: page.page_id,
                        page_label: page.page_label,
                        page_icon: page.page_icon,
                        page_path: page.page_path,
                        checked: true, // Default to false
                        ctas: allCtas.filter((cta: any) => cta.page_id === page.page_id).map((cta: any) => ({
                            ...cta,
                            checked: true // Default to false
                        }))
                    };
                    parentPage.sub_pages.push(childEntry);
                }
            }
        });

        return roleAccess;
    } catch (error: any) {
        throw new Error(`Error fetching available pages and CTAs: ${error.message}`);
    }
};

const createRoleWithPermissions = async (req: any) => {
    const { role_name, role_access, organization_id } = req.body;

    // Insert the new role into the `rbac_roles` table
    const newRoleId = await rbacModel.insertNewRole(role_name);

    // Save permissions for the role
    for (const page of role_access) {
        if (page.checked) {
            await rbacModel.assignPagePermissionToRole(organization_id, newRoleId, page.page_id);

            for (const subPage of page.sub_pages || []) {
                if (subPage.checked) {
                    await rbacModel.assignPagePermissionToRole(organization_id, newRoleId, subPage.page_id);

                    for (const cta of subPage.ctas || []) {
                        if (cta.checked) {
                            await rbacModel.assignCtaPermissionToRole(organization_id, newRoleId, cta.page_cta_id, subPage.page_id);
                        }
                    }
                }
            }
        }
    }

    return newRoleId;
};

const deleteRbacRole = async (req: any) => {
    const { role_id } = req.query
    const result = await rbacModel.deleteRbacRole(CONSTANTS.STATUS.IN_ACTIVE, role_id);
    if (!result || result.length === 0) {
        throw new Error("Failed to delete the role.");
    }
    return result;
};


export default {
    saveDefaultOrganizationAndPermission,
    saveDefaultOrganizationRolePermission,
    saveDefaultUserPermission,
    fetchUserPageNCtaPermission,
    V1_fetchUserPageNCtaPermission,
    fetchRolePermissionsDetailsById,
    fetchRoleDetailsById,
    fetchAllRbacRoles,
    fetchAllPagesAndCtas,
    createRoleWithPermissions,
    deleteRbacRole
}
