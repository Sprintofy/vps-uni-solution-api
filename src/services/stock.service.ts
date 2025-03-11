'use strict';
import CONSTANTS from '../common/constants/constants';
import stockModel from '../models/stock.model';
import fileService from './common/file.service';

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

const softDeleteStock = async (req: any) => {
    try {
        const { stock_id } = req.query || req.params;
        if (!stock_id) {
            throw new Error("Please provide either stock_id or script_code.");
        }

        const result = await stockModel.softDeleteStock(stock_id);

        if (result.affectedRows === 0) {
            throw new Error("Stock not found or already inactive.");
        }

        return result;
    } catch (error: any) {
        throw new Error(`Error in stock deletion : ${error.message}`);
    }
};


//// ------------- import stock --------------------
const import_stocks = async (req: any) => {
    try {
      console.log("inside import_stocks service -----> 1 ");
      const { fields, files } = (await fileService.parseFormData(req)) as any;
      if (!files || files.length === 0) {
        console.warn("No files uploaded.");
        return;
      }
      for (const file of files) {
        let parsedData: any[] = [];
        try {
          // Parse the file based on its extension
          if (file.originalFilename.endsWith(".csv")) {
            parsedData = await fileService.parseCSVFile(file.filepath);
          } else if (
            file.originalFilename.endsWith(".xlsx") ||
            file.originalFilename.endsWith(".xls")
          ) {
            parsedData = await fileService.parseExcelFile(file.filepath);
          } else {
            console.warn("Unsupported file type:", file.originalFilename);
            continue; // Skip unsupported files
          }
          // Process parsed data
          await processData(req, file, fields, parsedData);
          await fileService.deleteFile(file.filepath);
        } catch (error: any) {
          console.error(
            `Error processing file ${file.originalFilename}:`,
            error.message
          );
          await fileService.deleteFile(file.filepath);
        }
      }
    } catch (error: any) {
      console.error("Error importing clients:", error.message);
      throw new Error(`Error: ${error.message}`);
    }
  };

  const keyMapping = {
    STOCK_ID: "stock_id",
    SCRIPT_CODE: "script_code",
    SCRIPT_NAME: "script_name",
    STOCK_NAME: "stock_name",
    SHORT_NAME: "short_name",
    EXCHANGE_TYPE: "exchange_type",
    INSTRUMENT: "instrument",
    STRIKE_PRICE: "strike_price",
    GROUP_OPTION_TYPE: "group_option_type",
  //   STATUS: "status",
  //   CREATED_BY: "created_by",
  //   UPDATED_BY: "updated_by",
  //   CREATED_DATE: "created_date",
  //   UPDATED_DATE: "updated_date",
    CHECKED: "checked",
  } as any;

  const mapAndTrimData = async (
    data: any[],
    keyMapping: Record<string, string>
  ) => {
    console.log("inside service mapAndTrimData -----> 3");
    const transformedData = await Promise.all(
      data.map(async (item) => {
        let transformedItem: any = {};
        for (let key in item) {
          if (item.hasOwnProperty(key)) {
            // Get the new key from the mapping
            const newKey = keyMapping[key] || key; // Use original key if no mapping exists

            // Format the value (date or string)
            let formattedValue = item[key];

            // Format the value if it's a string or date
            // formattedValue = await formatRecordValues(formattedValue);

            // Trim both the key and the value
            transformedItem[newKey] =
              typeof formattedValue === "string"
                ? formattedValue.trim()
                : formattedValue;
          }
        }
        return transformedItem;
      })
    );

    return transformedData;
  };

  const processData = async (req: any, file: any, fields: any, data: any[]) => {
    try {
      console.log("inside service processData -----> 2");
      // Perform additional processing here (e.g., validation, status addition, etc.)
      const mappedData = await mapAndTrimData(data, keyMapping);
      await saveBulkStockInfo(req, fields, mappedData);
      // todo delete the local file after uploading s3

      return true;
    } catch (error: any) {
      console.error("Error processing data:", error.message);
      throw error;
    }
  };
  const saveBulkStockInfo = async (req: any, fields: any, data: any[]) => {
    try {
      console.log("saveBulkStockInfo --> 4");
      const stockPromises = data.map((stock: any) => {
        return stockModel.saveStock(stock);
      });

      await Promise.all(stockPromises);
      return { success: true, message: "Stocks processed successfully" };
    } catch (error) {
      console.error("Error processing bulk stock info:", error);
      throw error;
    }
  };

  ////--------------------- END ------------------------------------


export default {
    fetch_all_clients_with_pagination:fetch_all_clients_with_pagination,
    fetch_active_stock: fetch_active_stock,
    softDeleteStock:softDeleteStock,
    import_stocks : import_stocks


}
