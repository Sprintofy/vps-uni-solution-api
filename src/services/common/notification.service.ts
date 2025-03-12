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

const sendPreTradeEmailToClientOrganizationWise = async(organization_id:any,client:any)=> {
    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id)

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
               <p>As per your instructions this is a pre-trade confirmation for your client code. Please find the details below:</p>
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
            <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
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
      <p>Kindly reply to this email to  execute the above mentioned trades at our end. </p>
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
        subject: organizations_config[0].email_subject+" "+client.client_code,
        html: emailBody,
    };
    const email_response = await emailService.sendOrganizationWiseEmail(organization_id,mailOptions);
    if(email_response) {
        await tradeProofModel.update_pre_trade_proofs({is_email_sent:1,email_response:JSON.stringify(email_response)},client.pre_proof_id)
    } else {
        console.error("Email send to Failed..",client.email,"Error --->",email_response);
    }
    return true;
}

const generateSampleEmailPreTradeClientWise = async(organization_id:any,client:any)=> {

    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id)

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
               <p>As per your instructions this is a pre-trade confirmation for your client code. Please find the details below:</p>
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
            <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
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
      <p>Kindly reply to this email to  execute the above mentioned trades at our end. </p>
      <p></p>
      <p>Best Regards,</p>
      ${organizations_config[0].email_regards}
      </div>
    </div>
  </body>
  </html>`;

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',  // Path for Google Chrome installed via APT
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],  // Disable sandboxing
    });
    // const browser = await puppeteer.launch({
    //     headless: true,
    //     args: ['--no-sandbox', '--disable-setuid-sandbox'],  // Prevent permission issues
    // });
    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(emailBody);

    // Generate PDF

    const file_name = `${client.client_code}_sample_email_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../../public/upload'); // Create directory path relative to the current script
    const file_path = path.join(uploadDir, file_name);


    await page.pdf({ path: file_path, format: 'A4', printBackground: true });
    // Close the browser
    await browser.close();

    const aws_s3_url = await fileService.uploadSampleEmailPdfFileToS3Bucket(organization_id,{file_name,file_path})

    fs.unlinkSync(file_path);
    return aws_s3_url;

}

const generateSampleEmailBodyPreTradeClientWise = async(organization_id:any,client:any)=> {
    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id)
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
               <p>As per your instructions this is a pre-trade confirmation for your client code. Please find the details below:</p>
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
            <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
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
      <p>Kindly reply to this email to  execute the above mentioned trades at our end. </p>
      <p></p>
      <p>Best Regards,</p>
      ${organizations_config[0].email_regards}
      </div>
    </div>
  </body>
  </html>`;
    return emailBody;

}

const generatePreTradePdfFileClientWise = async(organization_id:any,data:any)=> {

    // todo fetch Email/template config From Organization wise

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
                    <th>Trigger Price</th>
                </tr>
            </thead>
            <tbody>
                ${data.unique_trade_info.map((trade: any, index: any) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${trade.script_name || ''}</td>
                   <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
                    <td>${trade.quantity || ''}</td>
                    <td>${trade.price}</td>
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
                    <td>09:15 AM</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
    </html>`;

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
       // executablePath: '/usr/bin/google-chrome-stable',  // Path for Google Chrome installed via APT
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Prevents memory issues
            '--disable-accelerated-2d-canvas',
            '--disable-gpu' // Disable GPU acceleration
        ],
    });
    // const browser = await puppeteer.launch({
    //     headless: true,
    //     args: ['--no-sandbox', '--disable-setuid-sandbox'],  // Prevent permission issues
    // });
   const page = await browser.newPage();

    // Set HTML content
     await page.setContent(htmlContent);

    // Generate PDF

    const file_name = `${data.client_code}_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../../public/upload'); // Create directory path relative to the current script
    const file_path = path.join(uploadDir, file_name);

    console.log(file_path);

     await page.pdf({ path: file_path, format: 'A4', printBackground: true });
    // Close the browser
     await browser.close();
     // await generatePdfFile(htmlContent, file_path);

    const aws_s3_url = await fileService.uploadPdfFileToS3Bucket(organization_id,{file_name,file_path})

    if(aws_s3_url) {
        await tradeProofModel.update_pre_trade_proofs({pdf_url:aws_s3_url},data.pre_proof_id)
    } else {
        console.error(" Generate Pdf ULR Failed --->",data.client_code);
    }
    fs.unlinkSync(file_path);
    return true;
}

const generatePreTradePdfSampleFile = async(organization_id:any,data:any)=> {

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
                    <th>Trigger Price</th>
                </tr>
            </thead>
            <tbody>
                ${data.unique_trade_info.map((trade: any, index: any) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${trade.script_name || ''}</td>
                   <td>${/s/i.test(trade.buy_or_sell) ? 'Sell' : 'Buy'}</td>
                    <td>${trade.quantity || ''}</td>
                    <td>${trade.price}</td>
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
                    <td>09:15 AM</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
        </html>`;
    return htmlContent;
}

const readPreTradeEmailToClientOrganizationWise = async(organization_id:any,client:any)=> {

    await emailService.readOrganizationWiseEmail(organization_id,null);
}

const generatePreTradeEmailPdfClientWise_old = async(organization_id:any,data:any)=> {

    // todo fetch Email/template config From Organization wise

    const htmlContent = data.htmlContent;

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',  // Path for Google Chrome installed via APT
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],  // Disable sandboxing
    });
    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(htmlContent);

    // Generate PDF

    const file_name = `${data.client_code}_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../../public/upload'); // Create directory path relative to the current script
    const file_path = path.join(uploadDir, file_name);

    console.log(file_path);

    await page.pdf({ path: file_path, format: 'A4', printBackground: true });
    // Close the browser
    await browser.close();
    // await generatePdfFile(htmlContent, file_path);

    const aws_s3_url = await fileService.uploadPdfFileToS3Bucket(organization_id,{file_name,file_path})

    fs.unlinkSync(file_path);
    return aws_s3_url;
}

const generatePreTradeEmailPdfClientWise = async (organization_id:any, data:any) => {
    try {

        // Ensure the upload directory exists
        const uploadDir = path.join(__dirname, '../../../../public/upload');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true }); // Create if not exists
        }

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            //executablePath: '/usr/bin/google-chrome-stable',  // Path for Google Chrome installed via APT
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Prevents memory issues
                '--disable-accelerated-2d-canvas',
                '--disable-gpu' // Disable GPU acceleration
            ],
        });

        const page = await browser.newPage();

        // Set HTML content
        await page.setContent(data.htmlContent, { waitUntil: 'load' });

        // Generate PDF
        const file_name = `${data.client_code}_${moment().format('DDMMYYYY_HH-mm-ss')}.pdf`;
        const file_path = path.join(uploadDir, file_name);

        console.log(`Saving PDF at: ${file_path}`);

        await page.pdf({ path: file_path, format: 'A4', printBackground: true });

        // Close browser
        await browser.close();

        // Upload PDF to S3
        const aws_s3_url = await fileService.uploadEmailFileToS3Bucket(organization_id, { file_name, file_path });

        // Remove local file after uploading
        fs.unlinkSync(file_path);

        return aws_s3_url;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

const sendPreTradeSingleEmailToClient= async(organization_id:any,trade_info:any)=> {

    const organizations_config = await organizationConfigModel.fetchOrganizationConfig(organization_id)

    const mailOptions = {
        from: organizations_config[0].from_email,
        to: [trade_info.client_email],
        subject: organizations_config[0].email_subject+" "+trade_info.client_code,
        html: trade_info.email_sample,
    };

    const email_response = await emailService.sendOrganizationWiseEmail(organization_id,mailOptions);

    if(email_response) {
        await tradeProofModel.update_pre_trade_proofs({is_email_sent:1,email_response:JSON.stringify(email_response)},trade_info.pre_trade_proof_id)
    } else {
        console.error("Email send to Failed..",trade_info.email,"Error --->",email_response);
    }
    return true;
}

export default {
    sendPreTradeEmailToClientOrganizationWise: sendPreTradeEmailToClientOrganizationWise,
    readPreTradeEmailToClientOrganizationWise: readPreTradeEmailToClientOrganizationWise,
    generatePreTradePdfFileClientWise: generatePreTradePdfFileClientWise,
    generatePreTradePdfSampleFile: generatePreTradePdfSampleFile,
    generatePreTradeEmailPdfClientWise:generatePreTradeEmailPdfClientWise,
    generateSampleEmailPreTradeClientWise:generateSampleEmailPreTradeClientWise,
    generateSampleEmailBodyPreTradeClientWise:generateSampleEmailBodyPreTradeClientWise,
    sendPreTradeSingleEmailToClient:sendPreTradeSingleEmailToClient
};
