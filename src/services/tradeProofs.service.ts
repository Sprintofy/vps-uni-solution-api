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
        const clients = await tradeProofsModel.fetch_all_clients_proofs(req.body.client_id,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await tradeProofsModel.fetch_all_clients_proofs_count(req.body.client_id,req.body.query || "");
        const statistics = await tradeProofsModel.fetch_all_clients_proofs_statistics(req.body.client_id)

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
        const clients = await tradeProofsModel.fetch_trade_by_client(req.body.client_id,req.body.query || "", req.body.pageSize,(req.body.pageIndex - 1) * req.body.pageSize,req.body.sort || "");
        const total = await tradeProofsModel.fetch_trade_by_client_count(req.body.client_id,req.body.query || "");
        const statistics = await tradeProofsModel.fetch_all_clients_proofs_statistics(req.body.client_id)
        return {
            total_trade_count: statistics[0].total_trade_count,
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
        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const downloadedFiles: string[] = [];

        // Download each file from S3
        // for (const key of keys) {
        //     const localFilePath = path.join(uploadDir, path.basename(key));
        //     await awsS3BucketService.downloadFileFromS3( key, localFilePath);
        //     downloadedFiles.push(localFilePath);
        // }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        // Upload the zip file back to S3
        const uploadedZipKey = `zipped/${file_name}`;
        const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

export const download_all_pdf = async (req: any): Promise<string> => {
    try {

        const zip_file_name = `pre_trade_all_files_${moment().format('YYYY_MM_DD_HH-mm-ss')}.zip`;

        const uploadDir = path.join(__dirname, '/uploads');

        const zip_file_path = path.join(uploadDir, zip_file_name);

        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Fetch all trade proof URLs
        const all_pdfs = await tradeProofsModel.fetch_all_trade_proof_urls();

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

        const fileContent = fs.createReadStream(zip_file_path);

        // Upload ZIP file to S3
        const zipFileUrl = await awsS3BucketService.uploadFile(fileContent, 'zipped', zip_file_name);

        // Cleanup local files
        downloadedFiles.forEach((file) => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        if (fs.existsSync(zip_file_path)) {
        }

        return zipFileUrl.Location;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

const download_zip_file = async (req:any) => {
    try {
        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '../../public/reports');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const downloadedFiles: string[] = [];

        // Download each file from S3
        // for (const key of keys) {
        //     const localFilePath = path.join(uploadDir, path.basename(key));
        //     await awsS3BucketService.downloadFileFromS3( key, localFilePath);
        //     downloadedFiles.push(localFilePath);
        // }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        // Upload the zip file back to S3
        const uploadedZipKey = `zipped/${file_name}`;
        const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

const download_all_pdf_by_client = async (req:any) => {
    try {

        console.log("in file download", req.query)
        if(!req.query.client_id){
            throw new Error(`Client Id is required`)
        }


        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '/uploads');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const keys = await tradeProofsModel.fetch_all_trade_proof_urls_by_client_id(req.query.client_id)

        // const keys: any[] = [
        //     {
        //         pdf_url: 'https://uni-solution-api.sprintofy.com/proofs/organization_1/PRB3134_trade_info_22_01_2025_17-07-15.pdf',
        //         pre_trade_proof_id: 1,
        //         client_code: 'PRB3134',
        //         created_date: '2024-12-12',
        //     },
        // ];

        if(keys.length === 0){
            throw new Error(`No files found for client id: ${req.query.client_id}`)
        }

        console.log("url",keys)

        const downloadedFiles: string[] = [];

        // Download each file
        for (const key of keys) {
            const fileName = `${key.pre_trade_proof_id}_${key.client_code}_${key.created_date}.pdf`;
            const localFilePath = path.join(uploadDir, fileName);

            const response :any = await axios({
                url: key.pdf_url,
                method: 'GET',
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(localFilePath);
            response.data.pipe(writer);



            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            console.log("url 5 ")


            downloadedFiles.push(localFilePath);
        }
        console.log("url 6",keys)


        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        console.log("url 7")

        const fileContent = fs.createReadStream(zipFilePath);


        // Upload zip file to S3
        const zipFileUrl = await awsS3BucketService.uploadFile(fileContent, 'zipped', file_name);

        console.log("url 8",zipFileUrl)

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        console.log("url 9",zipFileUrl)

        return zipFileUrl.Location;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
        throw error;
    }
};

const download_all_email_by_client = async (req:any) => {
    try {
        const file_name = `trade_all_files_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '../../../public/reports');
        const zipFilePath = path.join(uploadDir, file_name);

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const downloadedFiles: string[] = [];

        // Download each file from S3
        // for (const key of keys) {
        //     const localFilePath = path.join(uploadDir, path.basename(key));
        //     await awsS3BucketService.downloadFileFromS3( key, localFilePath);
        //     downloadedFiles.push(localFilePath);
        // }

        // Create a zip file
        await fileService.createZipFile(downloadedFiles, zipFilePath);

        // Upload the zip file back to S3
        const uploadedZipKey = `zipped/${file_name}`;
        const zipFileUrl = await awsS3BucketService.uploadFile('',uploadedZipKey, zipFilePath);

        // Cleanup local files
        downloadedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(zipFilePath);

        return zipFileUrl;
    } catch (error: any) {
        console.error(`Error processing files: ${error.message}`);
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
    download_all_email: download_all_email,
    download_all_pdf: download_all_pdf,
    download_all_pdf_by_client: download_all_pdf_by_client,
    download_all_email_by_client: download_all_email_by_client
}
