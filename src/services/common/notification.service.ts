"use strict";
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import CONSTANTS from '../../common/constants/constants';
import moment from "moment/moment";
import emailService from "../utilities/email.service";
import tradeProofModel from "../../models/tradeProofs.model";
const awsS3BucketService = require("../utilities/awsS3Bucket.service");
import organizationConfigModel from '../../models/organizationConfig.model'
import fileService from "./file.service";
const phantomPath = path.resolve(__dirname, '../../../../node_modules/phantomjs-prebuilt/bin/phantomjs');

//// ADD THIS HELPER FUNCTION AFTER IMPORTS ////
const safeDeleteFile = (filePath: string): void => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err: any) {
        console.warn(`Could not delete file ${filePath}:`, err.message);
    }
};

// ============== EMAIL QUEUE SYSTEM ==============
interface EmailTask {
    organization_id: any;
    mailOptions: any;
    client: any;
    retryCount: number;
}

class EmailQueue {
    private queue: EmailTask[] = [];
    private isProcessing: boolean = false;
    private readonly DELAY_BETWEEN_EMAILS = 3000; // 3 seconds between emails
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 60000; // 1 minute retry delay for failed emails

     private queuedProofIds: Set<number> = new Set();

    // Add email to queue
    // add(task: EmailTask) {
    //     this.queue.push(task);
    //     this.processQueue();
    // }
     add(task: EmailTask) {
        const proofId = task.client?.pre_proof_id;
        if (proofId && this.queuedProofIds.has(proofId)) {
            console.log(`⚠️ Email for proof_id ${proofId} already in queue, skipping duplicate`);
            return;
        }
        if (proofId) {
            this.queuedProofIds.add(proofId);
        }
        
        this.queue.push(task);
        this.processQueue();
    }

    // Process queue
    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                await this.sendEmail(task);
                // Wait before sending next email
                await this.delay(this.DELAY_BETWEEN_EMAILS);
            }
        }

        this.isProcessing = false;
    }

    // Send single email with retry logic
    private async sendEmail(task: EmailTask) {
        try {
            const email_response = await emailService.sendOrganizationWiseEmail(
                task.organization_id, 
                task.mailOptions
            );

            // if (email_response) {
            //     await tradeProofModel.update_pre_trade_proofs(
            //         { is_email_sent: 1, email_response: JSON.stringify(email_response) },
            //         task.client.pre_proof_id
            //     );
            //     console.log(`✅ Email sent successfully to: ${task.client.email}`);
            // } 
            if (email_response) {
                await tradeProofModel.update_pre_trade_proofs(
                    { is_email_sent: 1, email_response: JSON.stringify(email_response) },
                    task.client.pre_proof_id
                );
                console.log(`✅ Email sent successfully to: ${task.client.email}`);
                
                this.queuedProofIds.delete(task.client.pre_proof_id);
            }
            else {
                throw new Error('Email response was falsy');
            }
        } catch (error: any) {
            console.error(`❌ Email failed for ${task.client.email}:`, error.message);

            // Check if it's a rate limit error (421)
            if (error.responseCode === 421 && task.retryCount < this.MAX_RETRIES) {
                console.log(`🔄 Retrying ${task.client.email} in ${this.RETRY_DELAY/1000}s (Attempt ${task.retryCount + 1}/${this.MAX_RETRIES})`);
                
                // Add back to queue with incremented retry count after delay
                setTimeout(() => {
                    this.queuedProofIds.delete(task.client.pre_proof_id);

                    this.add({
                        ...task,
                        retryCount: task.retryCount + 1
                    });
                }, this.RETRY_DELAY);
            } else {
                // Log permanent failure
                await tradeProofModel.update_pre_trade_proofs(
                    { 
                        is_email_sent: 0, 
                        email_response: JSON.stringify({ error: error.message, failed_at: new Date() })
                    },
                    task.client.pre_proof_id
                );
                console.error(`❌ Email permanently failed for: ${task.client.email}`);
                this.queuedProofIds.delete(task.client.pre_proof_id);

            }
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get queue status
    getStatus() {
        return {
            pending: this.queue.length,
            isProcessing: this.isProcessing
        };
    }
}

// Create singleton instance
const emailQueue = new EmailQueue();

// ============== HELPER FUNCTION FOR SAFE MAP ==============
const safeMap = (array: any[], mapFn: (item: any, index: number) => string): string => {
    if (!array || !Array.isArray(array) || array.length === 0) {
        return '<tr><td colspan="8">No trade information available</td></tr>';
    }
    return array.map(mapFn).join('');
};

// ============== UPDATED FUNCTIONS ==============

const sendPreTradeEmailToClientOrganizationWise = async (organization_id: any, client: any) => {
    console.log("sendPreTradeEmailToClientOrganizationWise", organization_id);

    // Validate client data
    if (!client || !client.trade_info) {
        console.error("Invalid client data - missing trade_info for client:", client?.client_code);
        return false;
    }

    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id);

    if (!organizations_config || organizations_config.length === 0) {
        console.error("Organization config not found for:", organization_id);
        return false;
    }

    let emailBody = `<!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { width: 90%; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                        .header { font-size: 20px; font-weight: bold; color: #444; margin-bottom: 10px; }
                        .info { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        table, th, td { border: 1px solid #ddd; }
                        th, td { padding: 8px 12px; text-align: left; }
                        th { background-color: #f4f4f4; }
                        .footer { margin-top: 20px; font-size: 14px; color: #777; }
                    </style>
                </head>
                <body>
               <p>Dear ${client.client_name || 'Valued Client'},</p>
               <p>As per your instructions this is a pre-trade confirmation for your client code. Please find the details below:</p>
                <h2>Client Information</h2>
                  <table>
                    <tr>
                      <td><strong>Client Code</strong></td>
                      <td>${client.client_code || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Name</strong></td>
                      <td>${client.client_name || 'N/A'}</td>
                    </tr>
                  </table>
                  <h2>Trade Orders:</h2>
                <table>
        <thead>
          <tr>
            <th>Exchange Code</th>
            <th>Buy/Sell</th>
            <th>Product</th>
            <th>Script Name</th>
            <th>Quantity</th>
            <th>Order Type</th>
            <th>Price</th>
            <th>Trigger Price</th>
          </tr>
        </thead>
        <tbody>
          ${safeMap(client.trade_info, (trade: any) => `
          <tr>
            <td>${trade.exchange_code || ''}</td>
            <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
            <td>${trade.product || ''}</td>
            <td>${trade.script_name || ''}</td>
            <td>${trade.quantity || ''}</td>
            <td>${trade.order_type || ''}</td>
            <td>${trade.price || ''}</td>
            <td>${trade.trigger_price || ''}</td>
          </tr>`
          )}
        </tbody>
      </table>
      <div>
      <p>Kindly reply to this email to execute the above mentioned trades at our end.</p>
      <p></p>
      <p>Best Regards,</p>
      ${organizations_config[0].email_regards || ''}
      </div>
    </div>
  </body>
  </html>`;

    const mailOptions = {
        from: organizations_config[0].from_email,
        to: [client.email],
        subject: organizations_config[0].email_subject + " " + client.client_code,
        html: emailBody,
    };

    // Add to queue instead of sending directly
    emailQueue.add({
        organization_id,
        mailOptions,
        client,
        retryCount: 0
    });

    return true;
};

const generateSampleEmailPreTradeClientWise = async (organization_id: any, client: any) => {
    console.log("generateSampleEmailPreTradeClientWise", organization_id);

    // Validate client data
    if (!client || !client.trade_info) {
        console.error("Invalid client data - missing trade_info");
        return null;
    }

    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id);

    if (!organizations_config || organizations_config.length === 0) {
        console.error("Organization config not found");
        return null;
    }

    let emailBody = `<!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { width: 90%; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                        .header { font-size: 20px; font-weight: bold; color: #444; margin-bottom: 10px; }
                        .info { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        table, th, td { border: 1px solid #ddd; }
                        th, td { padding: 8px 12px; text-align: left; }
                        th { background-color: #f4f4f4; }
                        .footer { margin-top: 20px; font-size: 14px; color: #777; }
                    </style>
                </head>
                <body>
               <p>Dear ${client.client_name || 'Valued Client'},</p>
               <p>As per your instructions this is a pre-trade confirmation for your client code. Please find the details below:</p>
                <h2>Client Information</h2>
                  <table>
                    <tr>
                      <td><strong>Client Code</strong></td>
                      <td>${client.client_code || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Name</strong></td>
                      <td>${client.client_name || 'N/A'}</td>
                    </tr>
                  </table>
                  <h2>Trade Orders:</h2>
                <table>
        <thead>
          <tr>
            <th>Exchange Code</th>
            <th>Buy/Sell</th>
            <th>Product</th>
            <th>Script Name</th>
            <th>Quantity</th>
            <th>Order Type</th>
            <th>Price</th>
            <th>Trigger Price</th>
          </tr>
        </thead>
        <tbody>
          ${safeMap(client.trade_info, (trade: any) => `
          <tr>
            <td>${trade.exchange_code || ''}</td>
            <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
            <td>${trade.product || ''}</td>
            <td>${trade.script_name || ''}</td>
            <td>${trade.quantity || ''}</td>
            <td>${trade.order_type || ''}</td>
            <td>${trade.price || ''}</td>
            <td>${trade.trigger_price || ''}</td>
          </tr>`
          )}
        </tbody>
      </table>
      <div>
      <p>Kindly reply to this email to execute the above mentioned trades at our end.</p>
      <p></p>
      <p>Best Regards,</p>
      ${organizations_config[0].email_regards || ''}
      </div>
    </div>
  </body>
  </html>`;

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(emailBody);

    const file_name = `${client.client_code}_sample_email_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../../public/upload');
    const file_path = path.join(uploadDir, file_name);

    await page.pdf({ path: file_path, format: 'A4', printBackground: true });
    await browser.close();

    const aws_s3_url = await fileService.uploadSampleEmailPdfFileToS3Bucket(organization_id, { file_name, file_path });

    safeDeleteFile(file_path);
    return aws_s3_url;
};

const generateSampleEmailBodyPreTradeClientWise = async (organization_id: any, client: any) => {
    console.log("generateSampleEmailBodyPreTradeClientWise", organization_id);

    // Validate client data
    if (!client) {
        console.error("Invalid client data");
        return null;
    }

    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id);

    if (!organizations_config || organizations_config.length === 0) {
        console.error("Organization config not found");
        return null;
    }

    let emailBody = `<!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { width: 90%; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                        .header { font-size: 20px; font-weight: bold; color: #444; margin-bottom: 10px; }
                        .info { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        table, th, td { border: 1px solid #ddd; }
                        th, td { padding: 8px 12px; text-align: left; }
                        th { background-color: #f4f4f4; }
                        .footer { margin-top: 20px; font-size: 14px; color: #777; }
                    </style>
                </head>
                <body>
               <p>Dear ${client.client_name || 'Valued Client'},</p>
               <p>As per your instructions this is a pre-trade confirmation for your client code. Please find the details below:</p>
                <h2>Client Information</h2>
                  <table>
                    <tr>
                      <td><strong>Client Code</strong></td>
                      <td>${client.client_code || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Name</strong></td>
                      <td>${client.client_name || 'N/A'}</td>
                    </tr>
                  </table>
                  <h2>Trade Orders:</h2>
                <table>
        <thead>
          <tr>
            <th>Exchange Code</th>
            <th>Buy/Sell</th>
            <th>Product</th>
            <th>Script Name</th>
            <th>Quantity</th>
            <th>Order Type</th>
            <th>Price</th>
            <th>Trigger Price</th>
          </tr>
        </thead>
        <tbody>
          ${safeMap(client.trade_info, (trade: any) => `
          <tr>
            <td>${trade.exchange_code || ''}</td>
            <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
            <td>${trade.product || ''}</td>
            <td>${trade.script_name || ''}</td>
            <td>${trade.quantity || ''}</td>
            <td>${trade.order_type || ''}</td>
            <td>${trade.price || ''}</td>
            <td>${trade.trigger_price || ''}</td>
          </tr>`
          )}
        </tbody>
      </table>
      <div>
      <p>Kindly reply to this email to execute the above mentioned trades at our end.</p>
      <p></p>
      <p>Best Regards,</p>
      ${organizations_config[0].email_regards || ''}
      </div>
    </div>
  </body>
  </html>`;
    return emailBody;
};

const generatePreTradePdfFileClientWise = async (organization_id: any, data: any) => {
    
    // ✅ FIX: Validate data before processing
    if (!data) {
        console.error("generatePreTradePdfFileClientWise: data is undefined");
        return false;
    }

    if (!data.trade_info || !Array.isArray(data.trade_info)) {
        console.error("generatePreTradePdfFileClientWise: trade_info is undefined or not an array for client:", data?.client_code);
        return false;
    }

    const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Instruction Register</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        h1 {
            text-align: center;
            color: #444;
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
</head>
    <body>
    <div class="container">
        <h1>Order Instruction Register</h1>
        <p><strong>To,</strong><br> MOFSL</p>
        <p>
            You are requested to execute the following trades in my trading account bearing client code number 
            <strong>${data.client_code || 'N/A'}</strong> with Motilal Oswal Financial Services Ltd., as per the details mentioned below.
            Kindly confirm the execution to me through your regular format.
        </p>
        
        <table>
            <thead>
                <tr>
                    <th>Sr. No.</th>
                    <th>Scrip Name Mention Expiry Date (for Derivative Contracts)</th>
                    <th>Buy/Sell</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Trigger Price</th>
                </tr>
            </thead>
            <tbody>
                ${safeMap(data.trade_info, (trade: any, index: number) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${trade.script_name || ''}</td>
                    <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
                    <td>${trade.quantity || ''}</td>
                    <td>${trade.price || ''}</td>
                    <td>${trade.trigger_price || ''}</td>
                </tr>`
                )}
        </tbody>
        </table>

        <table>
            <tbody>
                <tr>
                    <td><strong>Client Code:</strong></td>
                    <td>${data.client_code || 'N/A'}</td>
                </tr>
                <tr>
                    <td><strong>Client Name:</strong></td>
                    <td>${data.client_name || 'N/A'}</td>
                </tr>
                <tr>
                    <td><strong>Client Signature:</strong></td>
                    <td>__________________________________</td>
                </tr>
                <tr>
                    <td><strong>Order Date((DD/MM/YYYY)):</strong></td>
                    <td>${moment().format('DD/MM/YYYY')}</td>
                </tr>
                <tr>
                    <td><strong>Order Time (HH:MM):</strong></td>
                    <td>09:15 AM</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
    </html>`;

    try {
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome-stable',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent);

        const file_name = `${data.client_code}_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
        const uploadDir = path.join(__dirname, '../../../../public/upload');
        const file_path = path.join(uploadDir, file_name);

        console.log(file_path);

        await page.pdf({ path: file_path, format: 'A4', printBackground: true });
        await browser.close();

        const aws_s3_url = await fileService.uploadPdfFileToS3Bucket(organization_id, { file_name, file_path });

        if (aws_s3_url) {
            await tradeProofModel.update_pre_trade_proofs({ pdf_url: aws_s3_url }, data.pre_proof_id);
        } else {
            console.error("Generate Pdf URL Failed --->", data.client_code);
        }
        
        safeDeleteFile(file_path);
        return true;

    } catch (error) {
        console.error("Error in generatePreTradePdfFileClientWise:", error);
        return false;
    }
};

const generatePreTradePdfSampleFile = async (organization_id: any, data: any) => {

    // Validate data
    if (!data || !data.trade_info) {
        console.error("generatePreTradePdfSampleFile: Invalid data");
        return null;
    }

    const htmlContent = `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Instruction Register</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        h1 {
            text-align: center;
            color: #444;
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
        </head>
        <body>
    <div class="container">
        <h1>Order Instruction Register</h1>
        <p><strong>To,</strong><br> MOFSL</p>
        <p>
            You are requested to execute the following trades in my trading account bearing client code number 
            <strong>${data.client_code || 'N/A'}</strong> with Motilal Oswal Financial Services Ltd., as per the details mentioned below.
            Kindly confirm the execution to me through your regular format.
        </p>
        
        <table>
            <thead>
                <tr>
                    <th>Sr. No.</th>
                    <th>Scrip Name Mention Expiry Date (for Derivative Contracts)</th>
                    <th>Buy/Sell</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Trigger Price</th>
                </tr>
            </thead>
            <tbody>
                ${safeMap(data.trade_info, (trade: any, index: number) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${trade.script_name || ''}</td>
                    <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
                    <td>${trade.quantity || ''}</td>
                    <td>${trade.price || ''}</td>
                    <td>${trade.trigger_price || ''}</td>
                </tr>`
                )}
        </tbody>
        </table>

        <table>
            <tbody>
                <tr>
                    <td><strong>Client Code:</strong></td>
                    <td>${data.client_code || 'N/A'}</td>
                </tr>
                <tr>
                    <td><strong>Client Name:</strong></td>
                    <td>${data.client_name || 'N/A'}</td>
                </tr>
                <tr>
                    <td><strong>Client Signature:</strong></td>
                    <td>__________________________________</td>
                </tr>
                <tr>
                    <td><strong>Order Date((DD/MM/YYYY)):</strong></td>
                    <td>${moment().format('DD/MM/YYYY')}</td>
                </tr>
                <tr>
                    <td><strong>Order Time (HH:MM):</strong></td>
                    <td>09:15 AM</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
        </html>`;
    return htmlContent;
};

const readPreTradeEmailToClientOrganizationWise = async (organization_id: any, client: any) => {
    await emailService.readOrganizationWiseEmail(organization_id, null);
};

const generatePreTradeEmailPdfClientWise_old = async (organization_id: any, data: any) => {

    const htmlContent = data.htmlContent;

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent);

    const file_name = `${data.client_code}_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../../public/upload');
    const file_path = path.join(uploadDir, file_name);

    console.log(file_path);

    await page.pdf({ path: file_path, format: 'A4', printBackground: true });
    await browser.close();

    const aws_s3_url = await fileService.uploadPdfFileToS3Bucket(organization_id, { file_name, file_path });

    safeDeleteFile(file_path);
    return aws_s3_url;
};

const generatePreTradeEmailPdfClientWise = async (organization_id: any, data: any) => {
    try {
        const uploadDir = path.join(__dirname, '../../../../public/upload');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome-stable',  // ← ADD THIS!
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
        });

        const page = await browser.newPage();

        await page.setContent(data.htmlContent, { waitUntil: 'load' });

        const file_name = `${data.client_code}_${moment().format('DDMMYYYY_HH-mm-ss')}.pdf`;
        const file_path = path.join(uploadDir, file_name);

        console.log(`Saving PDF at: ${file_path}`);

        await page.pdf({ path: file_path, format: 'A4', printBackground: true });

        await browser.close();

        const aws_s3_url = await fileService.uploadEmailFileToS3Bucket(organization_id, { file_name, file_path });

        safeDeleteFile(file_path);

        return aws_s3_url;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

const sendPreTradeSingleEmailToClient = async (organization_id: any, trade_info: any) => {

    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id);

    if (!organizations_config || organizations_config.length === 0) {
        console.error("Organization config not found");
        return false;
    }

    const mailOptions = {
        from: organizations_config[0].from_email,
        to: [trade_info.client_email],
        subject: organizations_config[0].email_subject + " " + trade_info.client_code,
        html: trade_info.email_sample,
    };

    // Add to queue instead of sending directly
    emailQueue.add({
        organization_id,
        mailOptions,
        client: {
            email: trade_info.client_email,
            pre_proof_id: trade_info.pre_trade_proof_id
        },
        retryCount: 0
    });

    return true;
};

// ✅ NEW: Get email queue status
const getEmailQueueStatus = () => {
    return emailQueue.getStatus();
};

export default {
    sendPreTradeEmailToClientOrganizationWise,
    readPreTradeEmailToClientOrganizationWise,
    generatePreTradePdfFileClientWise,
    generatePreTradePdfSampleFile,
    generatePreTradeEmailPdfClientWise,
    generateSampleEmailPreTradeClientWise,
    generateSampleEmailBodyPreTradeClientWise,
    sendPreTradeSingleEmailToClient,
    getEmailQueueStatus  // ✅ NEW: Export queue status function
};