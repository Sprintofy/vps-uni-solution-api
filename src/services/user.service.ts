'use strict';
import rbacService from './rbac.service';
import userModel from '../models/user.model'
import * as generatePassword from 'generate-password';
import hashing from '../utilities/hashing';
import encryption from '../appConfigs/utilities/encryption';
import CONFIGS from "../config";
import rbacModel from '../models/rbac.model';
import CONSTANTS from '../common/constants/constants';


const saveUserNPermissionWithTransaction = async (sqlTransaction: any, req: any) => {
    try {

        // Random Password Generated
        const password = generateRandomPassword();
        req.body.password = await hashing.generateHash(password, 10);

        const user = await saveUserWithTransaction(sqlTransaction, req);

        req.body.user_id = user.insertId;

        // Save Default User Page and Cta Permission
        await rbacService.saveDefaultUserPermission(sqlTransaction, req);

        return req.body.user_id;

    } catch (error: any) {
        // Transaction Rollback
        console.error(`Failed to save user: ${error.message}`);
        throw error;
    }
}

const loginWithEmail = async (req: any) => {
    // Fetch user details
    const user = await userModel.fetchUserInfoByEmail(req.body.email);

    if (user.length == 0) throw new Error("Invalid credentials");

    if (user.length && user[0].status == 0) {
        throw new Error("User is not authorized..!!");
    }

    // Password bcrypt and verify
    const match = await hashing.verifyHash(req.body.password, user[0].password);
    if (!match) throw new Error("Invalid password");

    const token = await encryption.generateJwtToken({
        user_id: user[0].user_id,
        organization_id: user[0].organization_id,
        role_id: user[0].role_id,
        expires_in: CONFIGS.SECURITY.JWT_TOKEN.EXPIRY
    });

    user[0].token = token;
    delete user[0].password;

    // Fetch the user's page and CTA permissions
    const permissions = await rbacModel.fetchUserPagePermission(user[0].user_id, user[0].organization_id, CONSTANTS.STATUS.ACTIVE);
    const cta_permissions = await rbacModel.fetchUserCtaPermission(user[0].user_id, user[0].organization_id, CONSTANTS.STATUS.ACTIVE);

    const role_access: any = {};

    // Process page permissions and build the role_access structure
    permissions.forEach((page: any) => {
        role_access[page.page_path] = {
            hasAccess: true,
        };

        // Initialize ctas as an empty object if no CTAs are available
        role_access[page.page_path].ctas = {};

        // Now check for CTAs associated with the page
        if (cta_permissions && Array.isArray(cta_permissions)) {
            // Loop through all the CTAs for the page and add them
            cta_permissions.forEach((cta: any) => {
                if (cta.page_id === page.page_id) {
                    role_access[page.page_path].ctas[cta.cta_path] = true;
                }
            });
        }
    });

    // Add the /accessDenied entry to the role_access
    role_access["/accessDenied"] = {
        hasAccess: true
    };

    return {
        ...user[0],
        role_access
    };
}

const fetchUserInfo = async (req: any) => {

    // fetch user details
    const user = await userModel.fetchUserInfoByUserId(req.query.user_id);
    if (!user.length) throw new Error("Invalid user");

    // get user page permission
    user[0].page_permissions = await rbacService.V1_fetchUserPageNCtaPermission({ user_id: user[0].user_id });

    // user[0].page_permissions =     {
    //     key: 'apps',
    //     path: '',
    //     title: '',
    //     translateKey: 'nav.apps',
    //     icon: 'apps',
    //     type: 'title',
    //     authority: ['ADMIN', 'USER'],
    //     subMenu: [
    //         {
    //             key: 'apps.project',
    //             path: '',
    //             title: 'Project',
    //             translateKey: 'nav.appsProject.project',
    //             icon: 'project',
    //             type: 'title',
    //             authority: ['ADMIN', 'USER'],
    //             subMenu: [
    //                 {
    //                     key: 'appsProject.dashboard',
    //                     path: `/app/project/dashboard`,
    //                     title: 'Dashboard',
    //                     translateKey: 'nav.appsProject.dashboard',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsProject.projectList',
    //                     path: `/app/project/project-list`,
    //                     title: 'Project List',
    //                     translateKey: 'nav.appsProject.projectList',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsProject.scrumBoard',
    //                     path: `/app/project/scrum-board`,
    //                     title: 'Scrum Board',
    //                     translateKey: 'nav.appsProject.scrumBoard',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsProject.issue',
    //                     path: `/app/project/issue`,
    //                     title: 'Issue',
    //                     translateKey: 'nav.appsProject.issue',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //             ],
    //         },
    //         {
    //             key: 'apps.crm',
    //             path: '',
    //             title: 'CRM',
    //             translateKey: 'nav.appsCrm.crm',
    //             icon: 'crm',
    //             type: 'title',
    //             authority:  ['ADMIN', 'USER'],
    //             subMenu: [
    //                 {
    //                     key: 'appsCrm.dashboard',
    //                     path: `/app/crm/dashboard`,
    //                     title: 'Dashboard',
    //                     translateKey: 'nav.appsCrm.dashboard',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrm.calendar',
    //                     path: `/app/crm/calendar`,
    //                     title: 'Calendar',
    //                     translateKey: 'nav.appsCrm.calendar',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrm.customers',
    //                     path: `/app}/crm/customers`,
    //                     title: 'Customers',
    //                     translateKey: 'nav.appsCrm.customers',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrm.customerDetails',
    //                     path: `/app/crm/customer-details?id=8`,
    //                     title: 'Customer Details',
    //                     translateKey: 'nav.appsCrm.customerDetails',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrm.mail',
    //                     path: `/app/crm/mail`,
    //                     title: 'Mail',
    //                     translateKey: 'nav.appsCrm.mail',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //             ],
    //         },
    //         {
    //             key: 'apps.sales',
    //             path: '',
    //             title: 'Sales',
    //             translateKey: 'nav.appsSales.sales',
    //             icon: 'sales',
    //             type: 'title',
    //             authority: ['ADMIN', 'USER'],
    //             subMenu: [
    //                 {
    //                     key: 'appsSales.dashboard',
    //                     path: `/app/sales/dashboard`,
    //                     title: 'Dashboard',
    //                     translateKey: 'nav.appsSales.dashboard',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsSales.productList',
    //                     path: `/app/sales/product-list`,
    //                     title: 'Product List',
    //                     translateKey: 'nav.appsSales.productList',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsSales.productEdit',
    //                     path: `/app/sales/product-edit/12`,
    //                     title: 'Product Edit',
    //                     translateKey: 'nav.appsSales.productEdit',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsSales.productNew',
    //                     path: `/app/sales/product-new`,
    //                     title: 'New Product',
    //                     translateKey: 'nav.appsSales.productNew',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsSales.orderList',
    //                     path: `/app/sales/order-list`,
    //                     title: 'Order List',
    //                     translateKey: 'nav.appsSales.orderList',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsSales.orderDetails',
    //                     path: `/app/sales/order-details/95954`,
    //                     title: 'Order Details',
    //                     translateKey: 'nav.appsSales.orderDetails',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //             ],
    //         },
    //         {
    //             key: 'apps.crypto',
    //             path: '',
    //             title: 'Crypto',
    //             translateKey: 'nav.appsCrypto.crypto',
    //             icon: 'crypto',
    //             type: 'title',
    //             authority: ['ADMIN', 'USER'],
    //             subMenu: [
    //                 {
    //                     key: 'appsCrypto.dashboard',
    //                     path: `/app/crypto/dashboard`,
    //                     title: 'Dashboard',
    //                     translateKey: 'nav.appsCrypto.dashboard',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrypto.portfolio',
    //                     path: `/app/crypto/portfolio`,
    //                     title: 'Portfolio',
    //                     translateKey: 'nav.appsCrypto.portfolio',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrypto.market',
    //                     path: `/app/crypto/market`,
    //                     title: 'Market',
    //                     translateKey: 'nav.appsCrypto.market',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsCrypto.wallets',
    //                     path: `/app/crypto/wallets`,
    //                     title: 'Wallets',
    //                     translateKey: 'nav.appsCrypto.wallets',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //             ],
    //         },
    //         {
    //             key: 'apps.knowledgeBase',
    //             path: '',
    //             title: 'Knowledge Base',
    //             translateKey: 'nav.appsknowledgeBase.knowledgeBase',
    //             icon: 'knowledgeBase',
    //             type: 'title',
    //             authority:  ['ADMIN', 'USER'],
    //             subMenu: [
    //                 {
    //                     key: 'appsknowledgeBase.helpCenter',
    //                     path: `/app/knowledge-base/help-center`,
    //                     title: 'Help Center',
    //                     translateKey: 'nav.appsknowledgeBase.helpCenter',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsknowledgeBase.article',
    //                     path: `/app/knowledge-base/article?id=rZjCbSyae5`,
    //                     title: 'Article',
    //                     translateKey: 'nav.appsknowledgeBase.article',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsknowledgeBase.manageArticles',
    //                     path: `/app/knowledge-base/manage-articles`,
    //                     title: 'Manage Articles',
    //                     translateKey: 'nav.appsknowledgeBase.manageArticles',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsknowledgeBase.editArticle',
    //                     path: `/app/knowledge-base/edit-article?id=rZjCbSyae5&categoryLabel=Survey&categoryValue=survey`,
    //                     title: 'Edit Article',
    //                     translateKey: 'nav.appsknowledgeBase.editArticle',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //             ],
    //         },
    //         {
    //             key: 'apps.account',
    //             path: '',
    //             title: 'Account',
    //             translateKey: 'nav.appsAccount.account',
    //             icon: 'account',
    //             type: 'title',
    //             authority: ['ADMIN', 'USER'],
    //             subMenu: [
    //                 {
    //                     key: 'appsAccount.settings',
    //                     path: `/app/account/settings/profile`,
    //                     title: 'Settings',
    //                     translateKey: 'nav.appsAccount.settings',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsAccount.invoice',
    //                     path: `/app/account/invoice/36223`,
    //                     title: 'Invoice',
    //                     translateKey: 'nav.appsAccount.invoice',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsAccount.activityLog',
    //                     path: `/app/account/activity-log`,
    //                     title: 'Activity Log',
    //                     translateKey: 'nav.appsAccount.activityLog',
    //                     icon: '',
    //                     type: 'title',
    //                     authority:  ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //                 {
    //                     key: 'appsAccount.kycForm',
    //                     path: `/app/account/kyc-form`,
    //                     title: 'KYC Form',
    //                     translateKey: 'nav.appsAccount.kycForm',
    //                     icon: '',
    //                     type: 'title',
    //                     authority: ['ADMIN', 'USER'],
    //                     subMenu: [],
    //                 },
    //             ],
    //         },
    //     ],
    // };
    delete user[0].password;
    return user[0];
}

/**************** MYSQL Curd Service *******************/

const saveUserWithTransaction = async (sqlTransaction: any, req: any) => {
    try {
        const data = {} as any;
        const body = req.body.user_information ? req.body.user_information : req.body;

        if (req.body.organization_id) data.organization_id = req.body.organization_id;
        if (req.body.role_id) data.role_id = req.body.role_id;
        if (req.body.password) data.password = req.body.password;
        if (body.first_name) data.first_name = body.first_name;
        if (body.middle_name) data.middle_name = body.middle_name;
        if (body.last_name) data.last_name = body.last_name;
        if (body.email) data.email = body.email;
        if (body.mobile) data.mobile = body.mobile;
        if (body.is_new) data.is_new = body.is_new;
        return await userModel.saveUserWithTransaction(sqlTransaction, data);
    } catch (error: any) {
        console.error(`Failed to save user: ${error.message}`);
        throw error;
    }
}

const saveUser = async (req: any) => {
    const data = {} as any;

    // Check if email exists
    if (req.body.email) {
        const emailExists = await userModel.emailExists(req.body.email);
        if (emailExists) {
            throw new Error("Email already exists. Please use a different email.");
        }
    }

    // Proceed with saving the user if email does not exist
    if (req.body.password) {
        const generatePassword = await hashing.generateHash(req.body.password, 10);
        data.password = generatePassword
    };
    if (req.body.organization_id) data.organization_id = req.body.organization_id;
    if (req.body.role_id) data.role_id = req.body.role_id;
    if (req.body.first_name) data.first_name = req.body.first_name;
    if (req.body.middle_name) data.middle_name = req.body.middle_name;
    if (req.body.last_name) data.last_name = req.body.last_name;
    if (req.body.email) data.email = req.body.email;
    if (req.body.mobile) data.mobile = req.body.mobile;
    if (req.body.is_new) data.is_new = req.body.is_new;
    if (req.body.status) data.status = req.body.status;

    const userData = await userModel.saveUser(data);
    if (!userData.insertId) {
        throw new Error("Failed to insert user data");
    }
    return { "insertId": userData.insertId }
}

/************* Function **************/

function generateRandomPassword(): string {
    const password = generatePassword.generate({
        length: 10,
        numbers: false,
        symbols: false,
        uppercase: true,
        lowercase: true,
    });
    // todo once remove hardcore value
    return 'password';
}

/************* User management **************/

const fetchAllUsers = async (req: any) => {
    try {
        const { query, pageSize, pageIndex, sort } = req.body;
        const usersList = await userModel.fetchAllUsers(query || "", pageSize, (pageIndex - 1) * pageSize, sort || "");
        const totalRecords = await userModel.fetchAllUsersTotal(query || "");
        return {
            data: usersList,
            total: totalRecords[0].total
        };
    } catch (error: any) {
        throw new Error(`Error fetching users: ${error.message}`);
    }
};

const fetchUserDetailsById = async (req: any): Promise<any> => {
    try {
        const userId = req.query.user_id;
        const userDetails = await userModel.findUserById(userId);

        if (!userDetails.length) throw new Error("User not found");
        return userDetails[0];
    } catch (error: any) {
        throw new Error(`Error fetching user details: ${error.message}`);
    }
};

const fetchAllRolesDropdown = async () => {
    try {
        const rolesList = await userModel.fetchAllRolesDropdown();
        const dropdownList = rolesList.map((role: any) => ({
            label: role.role_name,
            value: role.role_id
        }));

        return dropdownList;
    } catch (error: any) {
        throw new Error(`Error fetching roles for dropdown: ${error.message}`);
    }
};

const fetchUserPermissionsDetailsById = async (req: any): Promise<any> => {
    try {
        const { user_id, page_size, page_index } = req.query;

        const offset = (page_index - 1) * page_size;

        const userAccess = await userModel.fetchUserPageNCtaPermissions(user_id, page_size, offset);

        const permissionsCount = await userModel.fetchPagePermissionsCount();

        return {
            user_access: userAccess,
            total: permissionsCount[0].page_count
        };
    } catch (error: any) {
        throw new Error(`Error fetching user permissions: ${error.message}`);
    }
};

export default {
    saveUserNPermissionWithTransaction,
    loginWithEmail,
    fetchUserInfo,
    saveUser,
    fetchAllUsers,
    fetchUserDetailsById,
    fetchAllRolesDropdown,
    fetchUserPermissionsDetailsById
}
