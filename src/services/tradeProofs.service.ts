'use strict';
import path from "path";
import moment from "moment";
import fs from "fs";
import axios from 'axios';
import * as XLSX from 'xlsx';
import archiver from 'archiver';
import CONSTANTS from '../common/constants/constants';
import tradeProofsModel from '../models/tradeProofs.model';
import clientModel from "../models/client.model";
import fileService from './common/file.service';
import {executablePath} from "puppeteer";
import emailReadService from'./emailRead.service';
import emailService from "./utilities/email.service";
import tradeProofModel from "../models/tradeProofs.model";
import organizationConfigModel from "../models/organizationConfig.model";
import notificationService from "./common/notification.service";
const awsS3BucketService = require("./utilities/awsS3Bucket.service");


const fetch_all_clients_proofs = async (req: any) => {
    try {
        // emailReadService.read_email(req);
        let clients = await tradeProofsModel.fetch_all_clients_proofs(req.body.client_id,req.body.filterData,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const includeStocks = await tradeProofsModel.fetch_all_clients_proofs_include_stock(req.body.client_id,req.body.filterData,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");

        clients = clients.map((client:any) => {
            return {
                ...client,
                include_stocks: includeStocks.filter((stock:any) => stock.pre_trade_proof_id === client.pre_trade_proof_id) || []
            };
        });

        clients = clients.map((client:any) => {
            try {
                client.include_stocks = client.include_stocks.map((stock:any) =>
                    `<p>${stock.script_name} : <strong>${/s/i.test(stock.buy_or_sell) ? 'SELL' : 'BUY'}</strong></p>`
                );
            } catch (error) {
                client.include_stocks = []; // Set empty array if parsing fails
            }
            return client;
        });

        const total = await tradeProofsModel.fetch_all_clients_proofs_count(req.body.client_id,req.body.filterData,req.body.query || "");
        const statistics = await tradeProofsModel.fetch_all_clients_proofs_statistics(req.body.client_id,req.body.filterData,req.body.query || "")
        return {
            total_trade_count: statistics[0].total_trade_count || 0,
            total_pdf_generated_count: parseInt(statistics[0].total_pdf_generated_count) || 0,
            total_email_sent:parseInt(statistics[0].total_email_sent) || 0,
            total_email_received: parseInt(statistics[0].total_email_received) || 0,
            data:clients,
            total:total[0].total
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
}

const fetch_all_clients_trades_logs = async (req: any) => {
    try {
        //emailReadService.read_email(req);
        const clients = await tradeProofsModel.fetch_all_clients_trades_logs(1,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await tradeProofsModel.fetch_all_clients_trades_logs_count(1,req.body.query || "");
        return {
            data:clients,
            total:total[0].total
        }
    } catch (error: any) {
        console.error("Error importing clients:", error.message);
        throw new Error(`Error: ${error.message}`);
    }
}

const fetch_trades_details_by_client_id = async(req:any)=> {
    try {
        // emailReadService.read_email(req);
        const clients = await tradeProofsModel.fetch_trade_by_client(req.body.client_id,req.body.filterData,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await tradeProofsModel.fetch_trade_by_client_count(req.body.client_id,req.body.filterData,req.body.query || "");
        const statistics = await tradeProofsModel.fetch_all_clients_proofs_statistics(req.body.client_id,req.body.filterData,req.body.query)
        return {
            total_trade_count:total[0].total,
            total_pdf_generated_count: parseInt(statistics[0].total_pdf_generated_count),
            total_email_sent:parseInt(statistics[0].total_email_sent),
            total_email_received: parseInt(statistics[0].total_email_received),
            data:clients,
            total:total[0].total
        }
    } catch (error:any) {
        throw error
    }
}

const download_all_email = async (req: any) => {
    try {
        console.log("download_all_email")
        const zip_file_name = `pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '../../../public/upload');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        const excel_file_name = `pre_trade_CDR_${moment().format('YYYY_MM_DD_HH-mm-ss')}.xlsx`;
        const excel_file_path = path.join(uploadDir, excel_file_name);

        console.log("excel_file_name",excel_file_name)

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_emails = await tradeProofsModel.fetch_all_trade_proof_urls_email(1,req.query.start_date,req.query.end_date);

        console.log(all_emails)
        const downloadedFiles: string[] = [];
        const create_excel_data: any[] = []; // Ensure it's initialized as an array

        // Download each file
        for (const email of all_emails) {
            console.log(email)
            const fileName = `${email.client_code}_${email.pre_trade_proof_id}_${moment(email.created_date).format('DDMMYYYY')}.pdf`;
            const localFilePath = path.join(uploadDir, fileName);
            try {
                // Collect data for Excel
                create_excel_data.push({
                    'Trade Date': moment(email.created_date).format('YYYY-MM-DD'),
                    'Client Code': email.client_code,
                    'File Name': fileName, // Use correct file name
                });

                // Download the file
                const response = await axios({
                    url: email.email_url,
                    method: 'GET',
                    responseType: 'stream',
                }) as any;

                const writer = fs.createWriteStream(localFilePath);
                response.data.pipe(writer);

                await new Promise<void>((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                downloadedFiles.push(localFilePath);

            } catch (downloadError: any) {
                console.error(`Failed to download file from ${email.email_url}: ${downloadError.message}`);
            }
        }

        // Create Excel sheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(create_excel_data);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Emails");
        XLSX.writeFile(workbook, excel_file_path);

        // Add Excel file to zip
        downloadedFiles.push(excel_file_path);
       console.log("downloadedFiles",downloadedFiles)
        // Create a ZIP file
        await fileService.createZipFile(downloadedFiles, zip_file_path);

        // Upload Zip File to S3
        const results = await fileService.uploadZipFileToS3Bucket(1, {
            file_name: zip_file_name,
            file_path: zip_file_path
        });

        // Cleanup local files
        downloadedFiles.forEach((file) => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        // Cleanup local zip file
        if (fs.existsSync(zip_file_path)) fs.unlinkSync(zip_file_path);

        return results;
    } catch (error: any) {
        console.error(`Error downloading all emails: ${error.message}`);
        throw error;
    }
};

const download_all_pdf = async (req: any) => {
    try {

        const zip_file_name = `pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '../../../public/upload');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        const excel_file_name = `pre_trade_CDR_${moment().format('YYYY_MM_DD_HH-mm-ss')}.xlsx`;
        const excel_file_path = path.join(uploadDir, excel_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls(1,req.query.start_date || null,req.query.end_date || null);

        const downloadedFiles: string[] = [];
        const create_excel_data: any[] = []; // Ensure it's initialized as an array

        // Download each file
        for (const pdf of all_pdfs) {

            const fileName = `${pdf.client_code}_${pdf.pre_trade_proof_id}_${moment(pdf.created_date).format('DDMMYYYY')}.pdf`;

            const localFilePath = path.join(uploadDir, fileName);

            // Collect data for Excel
            create_excel_data.push({
                'Trade Date': moment(pdf.created_date).format('YYYY-MM-DD'),
                'Client Code': pdf.client_code,
                'File Name': fileName, // Use correct file name
            });

            try {
                const response = await axios({
                    url: pdf.pdf_url,
                    method: 'GET',
                    responseType: 'stream',
                }) as any;

                const writer = fs.createWriteStream(localFilePath);
                response.data.pipe(writer);

                await new Promise<void>((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                downloadedFiles.push(localFilePath);

            } catch (downloadError:any) {
                console.error(`Failed to download file from ${pdf.pdf_url}: ${downloadError.message}`);
            }
        }

        // Create Excel sheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(create_excel_data);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Emails");
        XLSX.writeFile(workbook, excel_file_path);

        // Add Excel file to zip
        downloadedFiles.push(excel_file_path);
        console.log("downloadedFiles",downloadedFiles)
        // Create a ZIP file
        await fileService.createZipFile(downloadedFiles, zip_file_path);

        // upload Zip File S3
        const results = await fileService.uploadZipFileToS3Bucket(1,{file_name:zip_file_name,file_path:zip_file_path});

        // Cleanup local files
        downloadedFiles.forEach((file) => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        // Cleanup local zip file
        if (fs.existsSync(zip_file_path)) fs.unlinkSync(zip_file_path);

        return results;
    } catch (error: any) {
        console.error(`Error processing download all pdf files: ${error.message}`);
        throw error;
    }
};

const download_all_pdf_by_client = async (req:any) => {
    try {

        const client_info = await clientModel.fetch_client_info_by_id(req.query.client_id);

        const zip_file_name = `${client_info[0].client_code}_pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '../../../public/upload');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls_by_client_id(req.query.client_id);

        const downloadedFiles: string[] = [];

        // Download each file
        for (const pdf of all_pdfs) {

            const fileName = `${pdf.pre_trade_proof_id}_${pdf.client_code}_${moment(pdf.created_date).format('DDMMYYYY')}.pdf`;

            const localFilePath = path.join(uploadDir, fileName);

            try {
                const response = await axios({
                    url: pdf.pdf_url,
                    method: 'GET',
                    responseType: 'stream',
                }) as any;

                const writer = fs.createWriteStream(localFilePath);
                response.data.pipe(writer);

                await new Promise<void>((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                downloadedFiles.push(localFilePath);

            } catch (downloadError:any) {
                console.error(`Failed to download file from ${pdf.pdf_url}: ${downloadError.message}`);
            }
        }

        // Create a ZIP file
        await fileService.createZipFile(downloadedFiles, zip_file_path);

        // upload Zip File S3
        const results = await fileService.uploadZipFileToS3Bucket(1,{file_name:zip_file_name,file_path:zip_file_path});

        // Cleanup local files
        downloadedFiles.forEach((file) => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        // Cleanup local zip file
        if (fs.existsSync(zip_file_path)) fs.unlinkSync(zip_file_path);

        return results;
    } catch (error: any) {
        console.error(`Error processing download all pdf by client files: ${error.message}`);
        throw error;
    }
};

const download_all_email_by_client = async (req:any) => {
    try {

        const client_info = await clientModel.fetch_client_info_by_id(req.query.client_id);

        const zip_file_name = `${client_info[0].client_code}_pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '../../../public/upload');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_emails = await tradeProofsModel.fetch_all_trade_proof_urls_by_client_id(req.query.client_id);

        const downloadedFiles: string[] = [];

        // Download each file
        for (const email of all_emails) {

            const fileName = `${email.pre_trade_proof_id}_${email.client_code}_${moment(email.created_date).format('DDMMYYYY')}.pdf`;

            const localFilePath = path.join(uploadDir, fileName);

            try {
                const response = await axios({
                    url: email.email_url,
                    method: 'GET',
                    responseType: 'stream',
                }) as any;

                const writer = fs.createWriteStream(localFilePath);
                response.data.pipe(writer);

                await new Promise<void>((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                downloadedFiles.push(localFilePath);

            } catch (downloadError:any) {
                console.error(`Failed to download file from ${email.email_url}: ${downloadError.message}`);
            }
        }

        // Create a ZIP file
        await fileService.createZipFile(downloadedFiles, zip_file_path);

        // upload Zip File S3
        const results = await fileService.uploadZipFileToS3Bucket(1,{file_name:zip_file_name,file_path:zip_file_path});

        // Cleanup local files
        downloadedFiles.forEach((file) => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        // Cleanup local zip file
        if (fs.existsSync(zip_file_path)) fs.unlinkSync(zip_file_path);

        return results;
    } catch (error: any) {
        console.error(`Error processing download all email by client files: ${error}`);
        throw error;
    }
};

const resend_email = async (req:any) => {
    try {
        const trade_info = await tradeProofsModel.fetch_trade_proof_Id(req.query.pre_trade_proof_id);

        if(trade_info && trade_info.length) {

          await notificationService.sendPreTradeSingleEmailToClient(1,trade_info[0])
            return true;

        } else {
            console.log(`Email already Sent ${trade_info}`);
            return true;
        }
    } catch (error: any) {
        console.error(`Error processing download all email by client files: ${error}`);
        throw error;
    }
};

const resend_email_all = async (req: any) => {
    try {
        const tradeInfoArray = await tradeProofsModel.fetch_trade_proof_email(req.query.organization_id || 1);

        const processTradeInfo = async (tradeInfoArray: any[]) => {
            for (const tradeInfo of tradeInfoArray) {
                if (tradeInfo) {
                    await notificationService.sendPreTradeSingleEmailToClient(req.query.organization_id || 1, tradeInfo);
                    console.log(`Email sent to ${tradeInfo.client_email}`);
                } else {
                    console.log(`Email already sent: ${JSON.stringify(tradeInfo)}`);
                }
            }
        };
        // Call the function to process trade info
        await processTradeInfo(tradeInfoArray);
    } catch (error: any) {
        console.error(`Error processing resend all emails: ${error.message}`);
        throw error;
    }
};

/*************** MYSQL CURD Operation *************/

// pre_trade_proofs
const save_pre_trade_proofs = async(req:any,body:any)=> {
    let data = {
        organization_id:req.user && req.user.organization_id ? req.user.organization_id : 1,
        created_by:req.user && req.user.user_id ? req.user.user_id : 1,
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.pre_trade_id !== undefined && body.pre_trade_id !== null && body.pre_trade_id !== '') data.pre_trade_id = body.pre_trade_id;
    if (body.client_id !== undefined && body.client_id !== null && body.client_id !== '') data.client_id = body.client_id;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== '') data.client_code = body.client_code;
    if (body.organization_id !== undefined && body.organization_id !== null && body.organization_id !== '') data.organization_id = body.organization_id;
    if (body.email_response !== undefined && body.email_response !== null && body.email_response !== '') data.email_response = body.email_response;
    if (body.is_email_sent !== undefined && body.is_email_sent !== null && body.is_email_sent !== '') data.is_email_sent = body.is_email_sent;
    if (body.is_email_received !== undefined && body.is_email_received !== null && body.is_email_received !== '') data.is_email_received = body.is_email_received;
    if (body.email_url !== undefined && body.email_url !== null && body.email_url !== '') data.email_url = body.email_url;
    if (body.email_proof !== undefined && body.email_proof !== null && body.email_proof !== '') data.email_proof = body.email_proof;
    if (body.pdf_url !== undefined && body.pdf_url !== null && body.pdf_url !== '') data.pdf_url = body.pdf_url;

    const results = await tradeProofsModel.save_pre_trade_proofs(data);
    return results;

}

const update_pre_trade_proofs = async(req:any,body:any)=> {
    let data = {
        updated_by:req.user && req.user.user_id ? req.user.user_id : 1,
    } as any;

    if (body.pre_trade_id !== undefined && body.pre_trade_id !== null && body.pre_trade_id !== '') data.pre_trade_id = body.pre_trade_id;
    if (body.client_id !== undefined && body.client_id !== null && body.client_id !== '') data.client_id = body.client_id;
    if (body.client_code !== undefined && body.client_code !== null && body.client_code !== '') data.client_code = body.client_code;
    if (body.organization_id !== undefined && body.organization_id !== null && body.organization_id !== '') data.organization_id = body.organization_id;
    if (body.email_id !== undefined && body.email_id !== null && body.email_id !== '') data.email_id = body.email_id;
    if (body.is_email_sent !== undefined && body.is_email_sent !== null && body.is_email_sent !== '') data.is_email_sent = body.is_email_sent;
    if (body.is_email_received !== undefined && body.is_email_received !== null && body.is_email_received !== '') data.is_email_received = body.is_email_received;
    if (body.email_url !== undefined && body.email_url !== null && body.email_url !== '') data.email_url = body.email_url;
    if (body.email_proof !== undefined && body.email_proof !== null && body.email_proof !== '') data.email_proof = body.email_proof;
    if (body.pdf_url !== undefined && body.pdf_url !== null && body.pdf_url !== '') data.pdf_url = body.pdf_url;
    if (body.status !== undefined && body.status !== null && body.status !== '') data.status = body.status;

    const results = await tradeProofsModel.update_pre_trade_proofs(data,body.pre_tades_proof_id);
    return results;

}

export default {
    fetch_all_clients_proofs:fetch_all_clients_proofs,
    fetch_trades_details_by_client_id:fetch_trades_details_by_client_id,
    fetch_all_clients_trades_logs:fetch_all_clients_trades_logs,
    download_all_pdf: download_all_pdf,
    download_all_email: download_all_email,
    download_all_pdf_by_client: download_all_pdf_by_client,
    download_all_email_by_client: download_all_email_by_client,
    resend_email:resend_email,
    resend_email_all:resend_email_all
}
