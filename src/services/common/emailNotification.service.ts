"use strict";
import CONSTANTS from '../../common/constants/constants';
import nodemailer from 'nodemailer';
import moment from "moment/moment";
import emailService from "./email.service";

const sendPreTradeEmailToClientOrganizationWise = async(organization_id:any,client:any)=> {
    // todo fetch Email/template config From Organization wise
    const organizations_config = {
        from_email: 'pravinjagtap2151@gmail.com',
        email_subject:`${client.client_code}_${moment().format('DDMMYYYY')}`
    }

    let emailBody = `
        <!DOCTYPE html>
        <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
        }
        .email-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .email-header {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .email-body {
            font-size: 16px;
            line-height: 1.5;
        }
        .email-footer {
            margin-top: 20px;
            font-size: 14px;
            color: #888;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table th, table td {
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
        }
        table th {
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            Dear ${client.client_name},
        </div>
        <div class="email-body">
            <p>We hope this email finds you well.</p>
            <p>This is a reminder for your trade orders. Please find the details below:</p>
            
            <h3>Client Information:</h3>
            <table>
                <tr>
                    <td><strong>Client Code:</strong></td>
                    <td>${client.client_code}</td>
                </tr>
                <tr>
                    <td><strong>Client Name:</strong></td>
                    <td>${client.client_name}</td>
                </tr>
            </table>

            <h3>Trade Orders:</h3>
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
                <tbody>`;

    client.client_trades.forEach((trade:any) => {
        emailBody += `
                    <tr>
                        <td>${trade.exchange_code}</td>
                        <td>${trade.buy_or_sell}</td>
                        <td>${trade.product}</td>
                        <td>${trade.script_name}</td>
                        <td>${trade.quantity}</td>
                        <td>${trade.order_type}</td>
                        <td>${trade.price}</td>
                        <td>${trade.trigger_price}</td>
                    </tr>`;
    });

    emailBody += `
                </tbody>
            </table>

            <p>For more details, please visit your trade portal.</p>
        </div>
        <div class="email-footer">
            <p>Best Regards,</p>
            <p>Your Company Name</p>
        </div>
    </div>
</body>
</html>
`;

    const mailOptions = {
        from: organizations_config.from_email ,
        to: [client.email],
        subject:organizations_config.email_subject,
        html: emailBody,
    };

    await emailService.sendOrganizationWiseEmail(organization_id,mailOptions);
}

export default {
    sendPreTradeEmailToClientOrganizationWise: sendPreTradeEmailToClientOrganizationWise
};
