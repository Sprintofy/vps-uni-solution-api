"use strict";
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import CONSTANTS from '../../common/constants/constants';
import nodemailer from 'nodemailer';
import moment from "moment/moment";
import emailService from "../utilities/email.service";
const awsS3BucketService = require("../utilities/awsS3Bucket.service");
import organizationConfigModel from '../../models/organizationConfig.model'

const sendPreTradeEmailToClientOrganizationWise = async(organization_id:any,client:any)=> {
    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id)

    console.log("organizations_config", organizations_config)
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
               <p>Dear ${client.client_name},</p>
               <p>As discussed, this is a pre-trade confirmation for your client code with Rainmakers Broking House trade orders.
                Please find the details below:</p>
                <h2>Client Information</h2>
                  <table>
                    <tr>
                      <td><strong>Client Code</strong></td>
                      <td>${client.client_code}</td>
                    </tr>
                    <tr>
                      <td><strong>Name</strong></td>
                      <td>${client.client_name}</td>
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
          ${client.unique_trade_info
        .map((trade:any) => `
          <tr>
            <td>${trade.exchange_code}</td>
            <td>${trade.buy_or_sell=='S'? 'Sell':'Buy' }</td>
            <td>${trade.product}</td>
            <td>${trade.script_name}</td>
            <td>${trade.quantity}</td>
            <td>${trade.order_type}</td>
            <td>${trade.price}</td>
            <td>${trade.trigger_price}</td>
          </tr>`
        )
        .join('')}
        </tbody>
      </table>
      <div>
      <p></p>
      <p>Best Regards,</p>
      ${organizations_config[0].email_regards}
      </div>
    </div>
  </body>
  </html>`;

    const mailOptions = {
        from: organizations_config[0].from_email ,
        to: [client.email],
        subject:organizations_config[0].email_subject,
        html: emailBody,
    };

    return await emailService.sendOrganizationWiseEmail(organization_id,mailOptions);
}

const generatePreTradeClientWise = async(organization_id:any,data:any)=> {

    // todo fetch Email/template config From Organization wise

    const organizations_config = {
        from_email: 'pravinjagtap2151@gmail.com',
        email_subject:`Pre Trade Confirmation`
        //email_subject:`${client.client_code}_${moment().format('DDMMYYYY')}`
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
            <strong>${data.client_code}</strong> with Motilal Oswal Financial Services Ltd., as per the details mentioned below.
            Kindly confirm the execution to me through your regular format.
        </p>
        
        <!-- First Table: Trade Information -->
        <table>
            <thead>
                <tr>
                    <th>Sr. No.</th>
                    <th>Scrip Name Mention Expiry Date (for Derivative Contracts)</th>
                    <th>Buy/Sell</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                </tr>
            </thead>
            <tbody>
                ${data.unique_trade_info.map((trade: any, index: any) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${trade.script_name || ''}</td>
                    <td>${trade.buy_or_sell == 'S' ? 'Sell' : 'Buy'}</td>
                    <td>${trade.quantity || ''}</td>
                    <td>${trade.trigger_price}</td>
                </tr>`
    ).join('')}
        </tbody>
        </table>

        <!-- Second Table: Client Information -->
        <table>
            <tbody>
                <tr>
                    <td><strong>Client Code:</strong></td>
                    <td>${data.client_code}</td>
                </tr>
                <tr>
                    <td><strong>Client Name:</strong></td>
                    <td>${data.client_name}</td>
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
                    <td>${moment().format('hh:mm A')}</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
`;

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(htmlContent);

    // Generate PDF

    const file_name = `${data.client_code}_trade_info_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../public/upload'); // Create directory path relative to the current script
    const file_path = path.join(uploadDir, file_name);

    console.log(file_path);
    await page.pdf({ path: file_path, format: 'A4', printBackground: true });
    // Close the browser
    await browser.close();

    const aws_s3_url = await uploadTemplateFileToS3(organization_id,{file_name,file_path})

    console.log("aws_s3_url",aws_s3_url)

   //  fs.unlinkSync(file_path);
    return aws_s3_url;
}

const uploadTemplateFileToS3 = async (organization_id:any,body: any) => {
    try {

        const s3FolderPath = CONSTANTS.AWS.S3_BUCKET.FOLDER_NAME + 1;

        // Check if "folder" exists on S3 by listing objects with a specific prefix
        const isFolderExists = await awsS3BucketService.isFolderExists(s3FolderPath);

        // Create "folder" (simulate directory) if it doesn't exist
        if (!isFolderExists) {
            const createFolder = await awsS3BucketService.createFolder(s3FolderPath);
        }

        // Upload the file to the specified "folder" in S3
        const fileStream = fs.createReadStream(body.file_path);

        const result = await awsS3BucketService.uploadFile(fileStream, s3FolderPath, body.file_name);

        return result.key;

    } catch (error:any) {
        console.error(`Error processing form or uploading file: ${error.message}`);
        throw error;
    }
};

const readPreTradeEmailToClientOrganizationWise = async(organization_id:any,client:any)=> {

    await emailService.readOrganizationWiseEmail(organization_id,null);
}

export default {
    sendPreTradeEmailToClientOrganizationWise: sendPreTradeEmailToClientOrganizationWise,
    readPreTradeEmailToClientOrganizationWise: readPreTradeEmailToClientOrganizationWise,
    generatePreTradeClientWise: generatePreTradeClientWise
};
