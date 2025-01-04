'use strict';
import CONSTANTS from '../common/constants/constants';
import clientModel from '../models/client.model';
import rbacModel from "../models/rbac.model";

const import_clients = async (req: any) => {
    try {
        return {
            data: [],
            total: 0
        };
    } catch (error: any) {
        throw new Error(`Error fetching RBAC roles: ${error.message}`);
    }
};

export default {
    import_clients: import_clients
}
