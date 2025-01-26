'use strict';
import CONSTANTS from '../common/constants/constants';
import stockModel from '../models/stock.model';

const fetch_all_clients_with_pagination = async (req: any) => {
    try {
        const clients = await stockModel.fetchAllStocksWithPagignation(1,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await stockModel.fetchAllStockCount(1,req.body.query || "");
        return {
            data:clients,
            total:total[0].total
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};

const fetch_active_stock = async (req: any) => {
    try {
        const results = await stockModel.fetch_active_stock();

        // Add dropdown fields to each JSON object in the results array
        const updatedResults = results.map((item: any) => ({
            ...item,
            buy_or_sell_drop_down: [
                { id: 1, value: "B", label: "BUY" },
                { id: 2, value: "S", label: "SELL" }
            ],
            exchange_code_drop_down: [
                { id: 1, value: "NSE", label: "NSE" },
                { id: 2, value: "BSE", label: "BSE" },
                { id: 3, value: "NSE FO", label: "NSE FO" },
                { id: 4, value: "MCX", label: "MCX" }
            ],
            order_type_drop_down: [
                { id: 1, value: "L", label: "L" },
                { id: 2, value: "P", label: "P" }
            ],
            product_drop_down: [
                { id: 1, value: "Delivery", label: "Delivery" },
                { id: 2, value: "Carry Forward", label: "Carry Forward" },
                { id: 3, value: "Intraday", label: "Intraday" },
                { id: 4, value: "MTF", label: "MTF" },
                { id: 5, value: "Normal", label: "Normal" },
                { id: 6, value: "Regular", label: "Regular" }
            ]
        }));
        return updatedResults;
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
};


export default {
    fetch_all_clients_with_pagination:fetch_all_clients_with_pagination,
    fetch_active_stock: fetch_active_stock

}
