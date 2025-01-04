'use strict';
import rbacModel from '../models/rbac.model';
import rbacPageModel from '../models/rbacPage.model';
import rbacPageCtaModel from '../models/rbacPageCta.model';
import CONSTANTS from '../common/constants/constants';

/************ Page **********/

const savePage = async (req: any): Promise<any> => {
    try {
        const { parent_id } = req.body;

        // For a parent page, ensure the parent_id is 0
        if (req.body.parent_id !== 0) {
            // Validate parent page exists only for subpages
            const parentPage = await rbacModel.fetchPageById(parent_id);
            if (!parentPage.length) throw new Error("Parent page not found");
        }
        const pageResults = await savePages(req);
        return pageResults;
    } catch (error: any) {
        console.error(`Failed to save page: ${error.message}`);
        throw new Error(`Failed to save page: ${error.message}`);
    }
}

const updatePage = async (req: any): Promise<any> => {

}

/************* Page CTA ***********/

const saveCta = async (req: any): Promise<any> => {
    try {
        // Validate subpage exists
        const subPage = await rbacModel.fetchPageById(req.body.page_id);
        if (!subPage.length) throw new Error("Subpage not found");
        const result = await savePageCta(req);
        return result;
    } catch (error: any) {
        console.error(`Failed to save CTA: ${error.message}`);
        throw new Error(`Failed to save CTA: ${error.message}`);
    }
}

const updateCta = async (req: any): Promise<any> => {

}

// MYSQL Curd Service

const savePages = async (req: any) => {
    let data = {
        status: CONSTANTS.STATUS.ACTIVE
    } as any;
    if (req.body.parent_id) data.parent_id = req.body.parent_id;
    if (req.body.page_name) data.page_name = req.body.page_name;
    if (req.body.page_label) data.page_label = req.body.page_label;
    if (req.body.page_path) data.page_path = req.body.page_path;
    if (req.body.page_icon) data.page_icon = req.body.page_icon;

    return await rbacPageModel.savePages(data);
}

const updatePages = async (req: any) => {
    let data = {} as any;

    if (req.body.parent_id) data.parent_id = req.body.parent_id;
    if (req.body.page_name) data.page_name = req.body.page_name;
    if (req.body.page_label) data.page_label = req.body.page_label;
    if (req.body.page_path) data.page_path = req.body.page_path;
    if (req.body.page_icon) data.page_icon = req.body.page_icon;
    if (req.body.status) data.status = req.body.status;

    return await rbacPageModel.updatePages(data, req.body.page_id);
}

const savePageCta = async (req: any) => {
    let data = {
        status: CONSTANTS.STATUS.ACTIVE
    } as any;
    if (req.body.page_id) data.page_id = req.body.page_id;
    if (req.body.cta_label) data.cta_label = req.body.cta_label;
    if (req.body.cta_path) data.cta_path = req.body.cta_path;
    return await rbacPageCtaModel.savePageCta(data);
}

const updatePageCta = async (req: any) => {
    let data = {} as any;

    if (req.body.page_id) data.page_id = req.body.page_id;
    if (req.body.cta_label) data.cta_label = req.body.cta_label;
    if (req.body.cta_path) data.cta_path = req.body.cta_path;
    if (req.body.status) data.status = req.body.status;

    return await rbacPageCtaModel.updatePageCta(data, req.body.page_cta_id);
}

export default {
    savePage,
    updatePage,
    saveCta,
    updateCta,
}
