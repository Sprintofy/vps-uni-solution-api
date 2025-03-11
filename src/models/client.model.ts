'use strict';
import BaseModel from "./dbConnection/base.model";

class ClientModel extends BaseModel {
    constructor() {
        super();
    }

    async fetch_all_clients(organization_id:number) {
        const query = `SELECT client_id,client_code,CONCAT(client_name, ' - ', client_code) AS client_name,email,mobile,status  FROM clients 
        WHERE organization_id = ? ;`;
        return await this._executeQuery(query, [organization_id]);
    }

    async fetch_all_clients_with_pagination(organization_id:number,searchText:any,limit:any,offset:any,sort:any) {
        let parameters=[];
        parameters.push(organization_id)
        let query =`SELECT client_id,client_code,client_name,email,mobile,status 
         FROM clients
         WHERE organization_id = ? `
        // Serach by client_code
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND client_name LIKE ? OR client_code LIKE ? ", parameters.push('%' + searchText + '%', '%' + searchText + '%')):""
        sort && sort.key !=="" && sort.order !=="" ? query += " ORDER BY " + sort.key + " " + sort.order : query += ""

        query += " LIMIT ? OFFSET ? ;";

        parameters.push(limit, offset);

        return await this._executeQuery(query, parameters)
    }

    async fetch_all_clients_count(organization_id:number ,searchText:any) {
        let parameters=[]
        parameters.push(organization_id);
        let query = `SELECT COUNT(client_id) as total FROM clients
         WHERE organization_id = ? `;
        searchText !== undefined && searchText !== null && searchText !== "" ? (query+="  AND  client_name LIKE ?  ", parameters.push('%' + searchText + '%')):""
        return await this._executeQuery(query, parameters)
    }

    async fetch_client_info_by_id(client_id: any) {
        const query = `SELECT c.client_id,c.client_code,c.client_name,c.email,c.mobile,c.status,
         ca.address_1,ca.address_2,ca.city_id,ca.city as city_name
         FROM clients c
         LEFT JOIN client_address ca ON ca.client_id = c.client_id
         WHERE c.client_id  = ? `;
        return await this._executeQuery(query, [client_id]);
    }

    async fetchClientInfoByIds(ids: any,organization_id:number) {
        const query = `
        SELECT 
        DISTINCT client_id,client_code,client_name,email,mobile,status,organization_id
        FROM clients 
        WHERE client_code IN (?)
        AND organization_id = ?;`;
        return await this._executeQuery(query, [ids,organization_id]);
    }

    async saveClientFileLog(data: any) {
        const query = `INSERT INTO client_files SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClient(data: any) {
        const query = `INSERT INTO clients SET ? ;`;
        return await this._executeQuery(query, [data]);
    }
    async saveClientProfile(data: any) {
        const query = `INSERT INTO client_profile SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    async saveClientAddress(data: any) {
        const query = `INSERT INTO client_address SET ? ;`;
        return await this._executeQuery(query, [data]);
    }

    /// ------------------- update client information --------------

    async fetch_client_details_by_id(client_id: any) {
        const query = `
        SELECT 
            ci.client_id,
            ci.client_code,
            ci.client_name,
            ci.mobile,
            ci.email,
            ci.is_auto_reply,
            ci.branch_code,
            ci.sub_broker_code,
            ci.dealer_code,
            cp.pan_number,
            cp.bank_name,
            cp.bank_account_number,
            cp.bank_ifsc_code,
            cp.date_of_birth,
            cp.default_dp,
            ca.city_id,
            ca.city,
            ca.pin_code,
            ca.address_1,
            ci.status ,
            ca.address_2
        FROM 
            clients ci
        LEFT JOIN 
            client_profile cp ON ci.client_id = cp.client_id 
        LEFT JOIN 
            client_address ca ON ci.client_id = ca.client_id 
        WHERE 
            ci.client_id = ?
        `;
        return await this._executeQuery(query, [client_id]);
    }

    async updateClientAddress(id: number, data: any) {
        const fieldsToUpdate = [];
        const values = [];

        // Dynamically build SET clause based on provided fields in data
        if (data.address_1) {
            fieldsToUpdate.push('address_1 = ?');
            values.push(data.address_1);
        }
        if (data.address_2) {
            fieldsToUpdate.push('address_2 = ?');
            values.push(data.address_2);
        }
        if (data.city) {
            fieldsToUpdate.push('city = ?');
            values.push(data.city);
        }
        if (data.city_id) {
            fieldsToUpdate.push('city_id = ?');
            values.push(data.city_id);
        }
        if (data.pin_code) {
            fieldsToUpdate.push('pin_code = ?');
            values.push(data.pin_code);
        }

        // Only add updated_by and updated_date if there are other fields to update
        if (fieldsToUpdate.length > 0) {
            fieldsToUpdate.push('updated_by = ?');
            values.push(data.updated_by);

            fieldsToUpdate.push('updated_date = ?');
            values.push(data.updated_date);

            // Build the final query
            const query = `
                UPDATE client_address 
                SET ${fieldsToUpdate.join(', ')} 
                WHERE client_id = ?;
            `;

            values.push(id);
            return await this._executeQuery(query, values);
        } else {
            return true;
        }
    }

    async updateClientProfile(id: number, data: any) {
        const fieldsToUpdate = [];
        const values = [];

        // Dynamically build SET clause based on provided fields in data
        if (data.pan_number) {
            fieldsToUpdate.push('pan_number = ?');
            values.push(data.pan_number);
        }
        if (data.bank_name) {
            fieldsToUpdate.push('bank_name = ?');
            values.push(data.bank_name);
        }
        if (data.bank_account_number) {
            fieldsToUpdate.push('bank_account_number = ?');
            values.push(data.bank_account_number);
        }
        if (data.bank_ifsc_code) {
            fieldsToUpdate.push('bank_ifsc_code = ?');
            values.push(data.bank_ifsc_code);
        }
        if (data.date_of_birth) {
            fieldsToUpdate.push('date_of_birth = ?');
            values.push(data.date_of_birth);
        }

        // Only add updated_by and updated_date if there are other fields to update
        if (fieldsToUpdate.length > 0) {
            fieldsToUpdate.push('updated_by = ?');
            values.push(data.updated_by);

            fieldsToUpdate.push('updated_date = ?');
            values.push(data.updated_date);

            const query = `
                UPDATE client_profile 
                SET ${fieldsToUpdate.join(', ')} 
                WHERE client_id = ?;
            `;

            values.push(id);  // Add client_id for WHERE clause
            // console.log("final client profile querry ",query)

            return await this._executeQuery(query, values);
        } else {
            return true;
        }
    }

    async updateClient(id: number, data: any) {
        const fieldsToUpdate = [];
        const values = [];

        // Dynamically build SET clause based on provided fields in data
        if (data.client_code) {
            fieldsToUpdate.push('client_code = ?');
            values.push(data.client_code);
        }
        if (data.client_name) {
            fieldsToUpdate.push('client_name = ?');
            values.push(data.client_name);
        }
        if (data.mobile) {
            fieldsToUpdate.push('mobile = ?');
            values.push(data.mobile);
        }
        if (data.email) {
            fieldsToUpdate.push('email = ?');
            values.push(data.email);
        }
        if (data.branch_code) {
            fieldsToUpdate.push('branch_code = ?');
            values.push(data.branch_code);
        }

        if (data.sub_broker_code) {
            fieldsToUpdate.push('sub_broker_code = ?');
            values.push(data.sub_broker_code);
        }
        if (data.dealer_code) {
            fieldsToUpdate.push('dealer_code = ?');
            values.push(data.dealer_code);
        }
        if (data.status !== undefined && data.status !== null && data.status !== "") {
            fieldsToUpdate.push('status = ?');
            values.push(data.status);
        }
        if (data.is_auto_reply !== null && data.is_auto_reply!=="") {
            fieldsToUpdate.push('is_auto_reply = ?');
            values.push(data.status);
        }

        // Only add updated_by and updated_date if there are other fields to update
        if (fieldsToUpdate.length > 0) {
            fieldsToUpdate.push('updated_by = ?');
            values.push(data.updated_by);

            fieldsToUpdate.push('updated_date = ?');
            values.push(data.updated_date);

            // Build the final query
            const query = `
                UPDATE clients 
                SET ${fieldsToUpdate.join(', ')} 
                WHERE client_id = ?;
            `;

            values.push(id);  // Add client_id for WHERE clause

            return await this._executeQuery(query, values);
        } else {
            return true;
        }
    }
    // ------------------------- END ----------------------------
}

export default new ClientModel()
