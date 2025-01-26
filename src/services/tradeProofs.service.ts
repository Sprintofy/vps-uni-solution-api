'use strict';
import path from "path";
import moment from "moment";
import fs from "fs";
import axios from 'axios';
import archiver from 'archiver';
import CONSTANTS from '../common/constants/constants';
import tradeProofsModel from '../models/tradeProofs.model';
import clientModel from "../models/client.model";
import fileService from './common/file.service';
const awsS3BucketService = require("./utilities/awsS3Bucket.service");

const fetch_all_clients_proofs = async (req: any) => {
    try {
        const clients = await tradeProofsModel.fetch_all_clients_proofs(req.body.client_id,req.body.filterData,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
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

const download_all_email = async (req:any) => {
    try {

        const zip_file_name = `pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls(1);

        const downloadedFiles: string[] = [];

        // Download each file
        for (const pdf of all_pdfs) {

            const fileName = `${pdf.pre_trade_proof_id}_${pdf.client_code}_${moment(pdf.created_date).format('YYYY-MM-DD_HH-mm-ss')}.pdf`;

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
        console.error(`Error download all email: ${error.message}`);
        throw error;
    }
};

const download_all_pdf = async (req: any) => {
    try {

        const zip_file_name = `pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls(1);

        const downloadedFiles: string[] = [];

        // Download each file
        for (const pdf of all_pdfs) {

            const fileName = `${pdf.pre_trade_proof_id}_${pdf.client_code}_${moment(pdf.created_date).format('YYYY-MM-DD_HH-mm-ss')}.pdf`;

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
        console.error(`Error processing download all pdf files: ${error.message}`);
        throw error;
    }
};

const download_all_pdf_by_client = async (req:any) => {
    try {

        const client_info = await clientModel.fetch_client_info_by_id(req.query.client_id);

        const zip_file_name = `${client_info[0].client_code}_pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls_by_client_id(req.query.client_id);

        const downloadedFiles: string[] = [];

        // Download each file
        for (const pdf of all_pdfs) {

            const fileName = `${pdf.pre_trade_proof_id}_${pdf.client_code}_${moment(pdf.created_date).format('YYYY-MM-DD_HH-mm-ss')}.pdf`;

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
        const uploadDir = path.join(__dirname, '/uploads');
        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls_by_client_id(req.query.client_id);

        const downloadedFiles: string[] = [];

        // Download each file
        for (const pdf of all_pdfs) {

            const fileName = `${pdf.pre_trade_proof_id}_${pdf.client_code}_${moment(pdf.created_date).format('YYYY-MM-DD_HH-mm-ss')}.pdf`;

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
        console.error(`Error processing download all email by client files: ${error}`);
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
    download_all_email_by_client: download_all_email_by_client
}
