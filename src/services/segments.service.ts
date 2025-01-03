'use strict';
import labModel from "../models/segments.model";
import labMappingModel from "../models/segmentMapping.model";

/*************** Tenant lab Services ***********/

const saveDefaultOrganizationBranchWithTransaction = async (sqlConnection:any,req: any): Promise<any> => {
    try {

        const branch = await saveBranchWithTransaction(sqlConnection,req);

        return branch.insertId;

    } catch (error:any) {
        console.error(`Failed to save default role and permission: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}


/**************** USER LAB Mapping  SERVICE ****************/

const saveUserBranchMappingWithTransaction = async (sqlConnection:any,req: any): Promise<any> => {
    try {

        const mapping = await saveLabMappingWithTransaction(sqlConnection,req);

        req.body.lab_mapping_id = mapping.insertId;

        return req.body.lab_mapping_id;

    } catch (error:any) {
        console.error(`Failed to save default role and permission: ${error.message}`);
        throw new Error(`Failed to save tenant: ${error.message}`);
    }
}



/*************** MYSQL CURD Services ***********/

const saveBranchWithTransaction = async (sqlConnection:any,req: any): Promise<any> => {
    try {
        const data = {} as any;

        const body = req.body.branch_information ? req.body.branch_information : req.body;

        if(body.organization_id)data.organization_id = body.organization_id;
        if(body.branch_name)data.branch_name = body.branch_name;
        if(body.branch_description)data.branch_description = body.branch_description;
        if(body.branch_email)data.branch_email = body.branch_email;
        if(body.branch_phone)data.branch_phone = body.branch_phone;

        if(req.user && req.user.user_id) { data.created_by = req.user.user_id; data.updated_by = req.user.user_id};

        return await labModel.saveTenantLabWithTransaction(sqlConnection,data);
    } catch (error:any) {
        console.error(`Failed to save Branch With Transaction: ${error.message}`);
        throw new Error(`Failed to save Branch With Transaction: ${error.message}`);
    }
}

const saveLab = async (req: any): Promise<any> => {
    try {

    } catch (error:any) {
        console.error(`Failed to save Lab: ${error.message}`);
        throw new Error(`Failed to save Lab: ${error.message}`);
    }
}

/**************** USER LAB Mapping MYSQL CURD SERVICE ****************/

const saveLabMappingWithTransaction = async (sqlConnection:any,req: any): Promise<any> => {
    try {

        const data = {
            user_id: req.body.user_id,
            organization_id: req.body.organization_id,
            branch_id: req.body.branch_id,
        } as any;

        return await labMappingModel.saveUserLabMappingWithTransaction(sqlConnection,data);

    } catch (error:any) {
        console.error(`Failed to save User Lab Mapping Transaction: ${error.message}`);
        throw new Error(`Failed to save User Lab Mapping Transaction: ${error.message}`);
    }
}


export default {

    /*************  TENANT LAB Service *************/
    saveDefaultOrganizationBranchWithTransaction: saveDefaultOrganizationBranchWithTransaction,

    /************* Tenant LAB MYSQL CURD Service *************/
    saveRole: saveLab,

    /************* USER LAB Service *************/
    saveUserBranchMappingWithTransaction:saveUserBranchMappingWithTransaction,

    /************* USER LAB MYSQL CURD Service *************/
}
