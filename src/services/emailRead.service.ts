'use strict';
import path from "path";
import { google } from 'googleapis';
import fs from "fs";
import Imap from "imap-simple";
import { simpleParser } from 'mailparser';
import puppeteer from 'puppeteer-core';
import emailService from './utilities/email.service';
import tradeProofsModel from "../models/tradeProofs.model";
import moment from "moment";
import fileService from "./common/file.service";
import notificationService from "./common/notification.service";
import preTradeModel from "../models/preTrade.model";

const fetchImapConfig = (organization_id: any) => {

    // todo daynamic Organization email fetch
    return {
        imap: {
            user: 'pretraderainmakers@gmail.com',
            password: 'geol grfr tyzr yzuk',
            host: 'imap.gmail.com', // e.g., imap.gmail.com for Gmail
            port: 993,
            tls: true,
            authTimeout: 3000,
            //debug: console.log,
            tlsOptions: {
                rejectUnauthorized: false // Disables certificate validation
            }
        }
    };
};

const read_email_p = async (req: any) => {
    try {
        const organization_id = 1;
        console.log(`Email read start for organization_id: ${organization_id}`);

        // Fetch the IMAP configuration dynamically
        const config = await fetchImapConfig(organization_id);
        if (!config) {
            throw new Error('IMAP configuration not found for the organization.');
        }

        console.log('Fetched IMAP config:', config);

        // Connect to the IMAP server
        const connection = await Imap.connect(config);
        console.log('Connected to IMAP server.');

        // Open the INBOX
        await connection.openBox('INBOX');
        console.log('Opened INBOX successfully.');

        // Define search criteria
        const searchCriteria = ['ALL', ['SINCE', 'Jan 10, 2025']];

        // Fetch options to get the full raw email data
        const fetchOptions = { bodies: [''], struct: true }; // Fetch raw email data
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (!messages || messages.length === 0) {
            console.log('No messages found matching the criteria.');
            return false;
        }

        console.log(`Fetched ${messages.length} messages.`);

        // Save and parse each email
        for (const message of messages) {
            try {
                const uid = message.attributes.uid; // Unique ID of the email
                const rawPart = message.parts.find((part: any) => part.which === ''); // Fetch raw data part

                if (rawPart && rawPart.body) {
                    const emlContent = rawPart.body;
                    // Parse the email using mailparser
                    const parsedEmail = await simpleParser(emlContent) as any;
                    console.log(`Parsed email UID ${uid}:`, parsedEmail.subject);
                    // Save the .eml file
                    const fileName = `email-${uid}.eml`;
                    fs.writeFileSync(fileName, emlContent, 'utf-8');
                    console.log(`Saved email as ${fileName}`);
                    // You can access parsed email details like this:
                    console.log(`From: ${parsedEmail.from?.text}`);
                    console.log(`To: ${parsedEmail.to?.text}`);
                    console.log(`Subject: ${parsedEmail.subject}`);
                    console.log(`Body: ${parsedEmail.text}`);
                } else {
                    console.error(`No raw email part found for UID ${uid}`);
                }
            } catch (messageError: any) {
                console.error(`Error processing message UID ${message.attributes.uid}:`, messageError.message);
            }
        }

        console.log('Email read, parsed, and saved successfully.');
        return true;
    } catch (error: any) {
        console.error('Error reading email:', error.message, error.stack);
        return false;
    }
};

const read_email_imap = async (req: any) => {
    try {
        const organization_id = 1;
        console.log(`Email read start for organization_id: ${organization_id}`);

        // Fetch the IMAP configuration dynamically
        const config = await fetchImapConfig(organization_id);
        if (!config) {
            throw new Error('IMAP configuration not found for the organization.');
        }

        console.log('Fetched IMAP config:', config);

        // Connect to the IMAP server
        const connection = await Imap.connect(config);
        console.log('Connected to IMAP server.');

        // Open the INBOX
        await connection.openBox('INBOX');
        console.log('Opened INBOX successfully.');

        // Define search criteria
        const searchCriteria = ['ALL', ['SINCE', 'Jan 10, 2025']];

        // Fetch options to get the full raw email data
        const fetchOptions = { bodies: [''], struct: true }; // Fetch raw email data
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (!messages || messages.length === 0) {
            console.log('No messages found matching the criteria.');
            return false;
        }

        console.log(`Fetched ${messages.length} messages.`);

        // To keep track of the threads
        const threads: any = {};

        // Save and parse each email
        for (const message of messages) {
            try {
                const uid = message.attributes.uid; // Unique ID of the email
                const rawPart = message.parts.find((part: any) => part.which === ''); // Fetch raw data part

                if (rawPart && rawPart.body) {
                    const emlContent = rawPart.body;
                    const parsedEmail = await simpleParser(emlContent) as any;

                    // Save the email as .eml
                    const fileName = `email-${uid}.eml`;
                    fs.writeFileSync(fileName, emlContent, 'utf-8');
                    console.log(`Saved email as ${fileName}`);

                    // Log parsed email details
                    console.log(`From: ${parsedEmail.from?.text}`);
                    console.log(`To: ${parsedEmail.to?.text}`);
                    console.log(`Subject: ${parsedEmail.subject}`);
                    console.log(`Body: ${parsedEmail.text}`);

                    // Check for the thread references to group messages
                    const references = parsedEmail.references || [];
                    const inReplyTo = parsedEmail.inReplyTo || [];

                    if (references.length || inReplyTo.length) {
                        const threadId = references[0] || inReplyTo[0] || uid; // Use references or inReplyTo to group
                        if (!threads[threadId]) {
                            threads[threadId] = [];
                        }
                        threads[threadId].push({ uid, emlContent });
                    } else {
                        if (!threads[uid]) {
                            threads[uid] = [];
                        }
                        threads[uid].push({ uid, emlContent });
                    }

                } else {
                    console.error(`No raw email part found for UID ${message.attributes.uid}`);
                }
            } catch (messageError: any) {
                console.error(`Error processing message UID ${message.attributes.uid}:`, messageError.message);
            }
        }

        // Now save each email thread (grouped by references or inReplyTo)
        for (const threadId in threads) {
            const threadEmails = threads[threadId];

            // Create a thread file
            const threadFileName = `email-thread-${threadId}.eml`;
            const threadRawEmails = threadEmails.map((email: any) => email.emlContent).join('\n\n'); // Join multiple parts
            fs.writeFileSync(threadFileName, threadRawEmails, 'utf-8');
            console.log(`Saved email thread as ${threadFileName}`);
        }

        console.log('Email read, parsed, and saved successfully.');
        return true;
    } catch (error: any) {
        console.error('Error reading email:', error.message, error.stack);
        return false;
    }
};

// google api

const read_email = async (req: any) => {
    try {
        const date = moment().format('YYYY-MM-DD'); // Get today's date
        const subject = "Pre Trade Confirmation"; // Replace with the required subject

        // todo fetch organizations
        const results = await tradeProofsModel.fetch_all_trade_proof_email_read(1,date);

        if(!results.length) {
            return true;
        }

        const client_proof_info: Record<string, { client_code: string; client_email: string; pre_trade_proof_id: number }> = {};

        results.forEach(({ client_email, client_code, pre_trade_proof_id }: { client_email: string; client_code: string; pre_trade_proof_id: number }) => {
            const emailKey = client_email.toLowerCase(); // Normalize email to lowercase
            client_proof_info[emailKey] = { client_code, client_email: emailKey, pre_trade_proof_id };
        });

        // Authenticate client
        const auth = await emailService.authenticateGoogleAuth(1);

        const gmail: any = google.gmail({ version: "v1", auth });
        const today = moment().format("YYYY-MM-DD"); // Get today's date
        const timeStamp = moment(`${today} 01:20`, "YYYY-MM-DD HH:mm").unix();

        //const timeStamp = moment().subtract(10, "minutes").unix();  // Get the current Unix timestamp in seconds
        const beforeTime = moment("YYYY-MM-DD").unix();

        const responses = await gmail.users.messages.list({
            userId: "me",
            q: `subject:"${subject}" after:${timeStamp}`
            //q: `subject:"${subject}" after:${timeStamp} before:${beforeTime}`
        });

        if(!responses.data.resultSizeEstimate) {
            console.log("No Message Found...!")
            return true;
        }

                    // Group emails by threadId
        const threads: { [key: string]: any[] } = {};

        for (const msg of responses.data.messages) {
            const email: any = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "full",
            });

            // console.log("email --------");
            // console.dir(email, { depth: null });

            // Get headers and message-id
            const allHeaders = email.data.payload?.headers || [];
            const messageIdHeader = allHeaders.find((header: any) =>
                header.name.toLowerCase() === "message-id"
            );

            threads[msg.threadId] = threads[msg.threadId] || [];

            const headers = Object.fromEntries(
                allHeaders.map((header: any) => [header.name, header.value])
            );

            // Extract the body
            let body = "";
            const payload = email.data.payload;

            if (payload.parts && payload.parts.length) {
                // For multipart emails
                for (const part of payload.parts) {
                if (part.mimeType === "text/html" && part.body?.data) {
                    body = Buffer.from(part.body.data, "base64").toString("utf-8");
                    break;
                } else if (part.mimeType === "text/plain" && part.body?.data) {
                    // Fallback to text/plain if html is not found
                    body = Buffer.from(part.body.data, "base64").toString("utf-8");
                }
                }
            } else if (payload.body && payload.body.data) {
                // For non-multipart emails (like email 2)
                 const decodedBody = Buffer.from(payload.body.data, "base64").toString("utf-8");

                 // Extract the content between <body> and </body>
                    const match = decodedBody.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    body = match ? match[1] : decodedBody;
            }

                        // console.log("body  --------",body);


            threads[msg.threadId].push({
                id: msg.id,
                messageId: messageIdHeader,
                headers,
                body,
            });
            }


        console.log("threads---------",threads)
        const extractEmailParts = (headerValue: string) => {
            const match = headerValue.match(/(.*?)\s*<(.*)>/);
            return match ? [match[1].trim(), match[2]] : [headerValue, ''];
        };

        const finalThread = {} as any


        // await Promise.all(
        //     Object.entries(threads).map(async ([threadId, emails]) => {
        //         finalThread[threadId] = {
        //             thread_id : threadId,
        //             emails: [] as any
        //         } as any;
        //         // Sort emails by date (oldest to newest)
        //         emails.sort((a:any, b:any) => new Date(a.headers.Date).getTime() - new Date(b.headers.Date).getTime());
        //         if(emails.length) {
        //             const [namePart, emailPart] = extractEmailParts(emails[0].headers.From);
        //            emails.map((email:any) => {
        //                 const [senderName, senderEmail] = extractEmailParts(email.headers.From);
        //                 const [recipientName, recipientEmail] = extractEmailParts(email.headers.To);
        //                if(client_proof_info[senderEmail]) {
        //                    finalThread[threadId].client_code = client_proof_info[senderEmail].client_code;
        //                    finalThread[threadId].client_email = client_proof_info[senderEmail].client_email;
        //                    finalThread[threadId].pre_trade_proof_id = client_proof_info[senderEmail].pre_trade_proof_id;
        //                    finalThread[threadId].emails = emails
        //                }
        //                // console.log("recipientName",recipientName,recipientEmail)
        //                 return true
        //             });
        //         }
        //         return true;
        //     })
        // );

        // console.log("finalThread",finalThread)


        await Promise.all(
            Object.entries(threads).map(async ([threadId, emails]) => {
                finalThread[threadId] = {
                    thread_id : threadId,
                    emails: [] as any
                } as any;

                emails.sort((a:any, b:any) => new Date(a.headers.Date).getTime() - new Date(b.headers.Date).getTime());
                if(emails.length > 1) {
                    const [namePart, emailPart] = extractEmailParts(emails[0].headers.From);
                    let emailPart2 = ' '
                    if(!emailPart){
                         emailPart2 = namePart
                    }else{
                        emailPart2 = emailPart
                    }


                    let htmlContent = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Gmail - ${emails[0].headers.Subject}</title>
           
                    <style>
            body, td, div, p, a, input { font-family: arial, sans-serif; }
            body, td { font-size: 13px; }
            a:link, a:active { color: #1155CC; text-decoration: none; }
            a:hover { text-decoration: underline; cursor: pointer; }
            img { border: 0px; }
            pre { white-space: pre-wrap; word-wrap: break-word; max-width: 800px; overflow: auto; }
            .logo { left: -7px; position: relative; }
        </style>
        </head>
        <body>
            <div class="bodycontainer">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr height="14px">
                        <td width="143">
                            <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_server_1x.png" width="143" height="59" alt="Gmail" class="logo">
                        </td>
                        <td align="right">
                            <font size="-1" color="#777"><b>${namePart}</b> &lt;${emailPart2}&gt;</font>
                        </td>
                    </tr>
                </table>
                <hr>
                <div class="maincontent">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td>
                                <font size="+1"><b>${emails[0].headers.Subject}</b></font><br>
                                <font size="-1" color="#777">${emails.length} messages</font>
                            </td>
                        </tr>
                    </table>`;

                    htmlContent += emails.map((email:any) => {
                         //console.log("inner email",email)
                        let [senderName, senderEmail] = extractEmailParts(email.headers.From);
                        let [recipientName, recipientEmail] = extractEmailParts(email.headers.To);
                        //console.log("senderEmail email",senderEmail)
                        //console.log("recipientEmail email",recipientEmail)

                        // replace Email with can
                        if (senderEmail.toLowerCase().includes("canned")) {
                            senderEmail = senderEmail.replace(/(\+[^@]*)@/, "@")
                            // console.log("senderEmail",senderEmail)

                        }

                        let senderEmail2 = ' '
                        if(senderEmail){
                            senderEmail2 = senderEmail
                        }else{
                            senderEmail2 = senderName
                        }

                        if(client_proof_info[senderEmail]) {
                            console.log("client_proof_info",client_proof_info[senderEmail])
                            finalThread[threadId].client_code = client_proof_info[senderEmail].client_code;
                            finalThread[threadId].client_email = client_proof_info[senderEmail].client_email;
                            finalThread[threadId].pre_trade_proof_id = client_proof_info[senderEmail].pre_trade_proof_id;
                            finalThread[threadId].emails = emails
                        }

                        return `<hr>
                <table width="100%" cellpadding="0" cellspacing="0" class="message">
                    <tr>
                        <td><font size="-1"><b>${senderName}</b> &lt;${senderEmail2}&gt;</font></td>
                        <td align="right"><font size="-1">${formatDate(email.headers.Date)}</font></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-bottom: 4px;">
                            <font size="-1" class="recipient">
                                <div>To: ${recipientName} ${recipientEmail ? `&lt;${recipientEmail}&gt;` : ''}</div>
                            </font>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <table width="100%" cellpadding="12" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="overflow: hidden;">
                                            <font size="-1">${email.body}</font>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`;
                    }).join('');

                    htmlContent += `</div></div></body></html>`;

                    const email_url = await notificationService.generatePreTradeEmailPdfClientWise(1, { htmlContent, client_code: finalThread[threadId].client_code });
                    finalThread[threadId].email_url = email_url
                    console.log(email_url)
                    await tradeProofsModel.update_pre_trade_proofs({email_url:email_url},finalThread[threadId].pre_trade_proof_id);
                }
                return true;
            })
        );

        // // Iterate and update each object in the data structure
        // Object.values(finalThread).forEach(({ email_url, pre_trade_proof_id }) => {
        //     console.log(`email_url: ${email_url}, pre_trade_proof_id: ${pre_trade_proof_id}`);
        // });

        return true;
    } catch(error: any) {
        console.log(error)
        return  true;
    }

};

const read_email_auto = async (req: any) => {
    try {
        const date = moment().format('YYYY-MM-DD'); // Get today's date
        const subject = "Pre Trade Confirmation"; // Replace with the required subject

        // todo fetch organizations
        const results = await tradeProofsModel.fetch_all_trade_proof_email_read(1,date);

        if(!results.length) {
            return true;
        }

        const client_proof_info: Record<string, { client_code: string; client_email: string; pre_trade_proof_id: number }> = {};

        results.forEach(({ client_email, client_code, pre_trade_proof_id }: { client_email: string; client_code: string; pre_trade_proof_id: number }) => {
            const emailKey = client_email.toLowerCase(); // Normalize email to lowercase
            client_proof_info[emailKey] = { client_code, client_email: emailKey, pre_trade_proof_id };
        });

        // Authenticate client
        const auth = await emailService.authenticateGoogleAuth(1);

        const gmail: any = google.gmail({ version: "v1", auth });
        const today = moment().format("YYYY-MM-DD"); // Get today's date
        //const timeStamp = moment(`${today} 01:20`, "YYYY-MM-DD HH:mm").unix();

        const timeStamp = moment().subtract(15, "minutes").unix();  // Get the current Unix timestamp in seconds
        const beforeTime = moment("YYYY-MM-DD").unix();

        const responses = await gmail.users.messages.list({
            userId: "me",
            q: `subject:"${subject}" after:${timeStamp}`
            //q: `subject:"${subject}" after:${timeStamp} before:${beforeTime}`
        });

        if(!responses.data.resultSizeEstimate) {
            console.log("No Message Found...!")
            return true;
        }

        // Group emails by threadId
        const threads: { [key: string]: any[] } = {};

        for (const msg of responses.data.messages) {
            const email: any = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "full",
            });

            // console.log("email --------");
            // console.dir(email, { depth: null });

            // Get headers and message-id
            const allHeaders = email.data.payload?.headers || [];
            const messageIdHeader = allHeaders.find((header: any) =>
                header.name.toLowerCase() === "message-id"
            );

            threads[msg.threadId] = threads[msg.threadId] || [];

            const headers = Object.fromEntries(
                allHeaders.map((header: any) => [header.name, header.value])
            );

            // Extract the body
            let body = "";
            const payload = email.data.payload;

            if (payload.parts && payload.parts.length) {
                // For multipart emails
                for (const part of payload.parts) {
                    if (part.mimeType === "text/html" && part.body?.data) {
                        body = Buffer.from(part.body.data, "base64").toString("utf-8");
                        break;
                    } else if (part.mimeType === "text/plain" && part.body?.data) {
                        // Fallback to text/plain if html is not found
                        body = Buffer.from(part.body.data, "base64").toString("utf-8");
                    }
                }
            } else if (payload.body && payload.body.data) {
                // For non-multipart emails (like email 2)
                const decodedBody = Buffer.from(payload.body.data, "base64").toString("utf-8");

                // Extract the content between <body> and </body>
                const match = decodedBody.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                body = match ? match[1] : decodedBody;
            }

            // console.log("body  --------",body);


            threads[msg.threadId].push({
                id: msg.id,
                messageId: messageIdHeader,
                headers,
                body,
            });
        }


        console.log("threads---------",threads)
        const extractEmailParts = (headerValue: string) => {
            const match = headerValue.match(/(.*?)\s*<(.*)>/);
            return match ? [match[1].trim(), match[2]] : [headerValue, ''];
        };

        const finalThread = {} as any


        // await Promise.all(
        //     Object.entries(threads).map(async ([threadId, emails]) => {
        //         finalThread[threadId] = {
        //             thread_id : threadId,
        //             emails: [] as any
        //         } as any;
        //         // Sort emails by date (oldest to newest)
        //         emails.sort((a:any, b:any) => new Date(a.headers.Date).getTime() - new Date(b.headers.Date).getTime());
        //         if(emails.length) {
        //             const [namePart, emailPart] = extractEmailParts(emails[0].headers.From);
        //            emails.map((email:any) => {
        //                 const [senderName, senderEmail] = extractEmailParts(email.headers.From);
        //                 const [recipientName, recipientEmail] = extractEmailParts(email.headers.To);
        //                if(client_proof_info[senderEmail]) {
        //                    finalThread[threadId].client_code = client_proof_info[senderEmail].client_code;
        //                    finalThread[threadId].client_email = client_proof_info[senderEmail].client_email;
        //                    finalThread[threadId].pre_trade_proof_id = client_proof_info[senderEmail].pre_trade_proof_id;
        //                    finalThread[threadId].emails = emails
        //                }
        //                // console.log("recipientName",recipientName,recipientEmail)
        //                 return true
        //             });
        //         }
        //         return true;
        //     })
        // );

        // console.log("finalThread",finalThread)


        await Promise.all(
            Object.entries(threads).map(async ([threadId, emails]) => {
                finalThread[threadId] = {
                    thread_id : threadId,
                    emails: [] as any
                } as any;

                emails.sort((a:any, b:any) => new Date(a.headers.Date).getTime() - new Date(b.headers.Date).getTime());
                if(emails.length > 1) {
                    const [namePart, emailPart] = extractEmailParts(emails[0].headers.From);
                    let emailPart2 = ' '
                    if(!emailPart){
                        emailPart2 = namePart
                    }else{
                        emailPart2 = emailPart
                    }


                    let htmlContent = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Gmail - ${emails[0].headers.Subject}</title>
           
                    <style>
            body, td, div, p, a, input { font-family: arial, sans-serif; }
            body, td { font-size: 13px; }
            a:link, a:active { color: #1155CC; text-decoration: none; }
            a:hover { text-decoration: underline; cursor: pointer; }
            img { border: 0px; }
            pre { white-space: pre-wrap; word-wrap: break-word; max-width: 800px; overflow: auto; }
            .logo { left: -7px; position: relative; }
        </style>
        </head>
        <body>
            <div class="bodycontainer">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr height="14px">
                        <td width="143">
                            <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_server_1x.png" width="143" height="59" alt="Gmail" class="logo">
                        </td>
                        <td align="right">
                            <font size="-1" color="#777"><b>${namePart}</b> &lt;${emailPart2}&gt;</font>
                        </td>
                    </tr>
                </table>
                <hr>
                <div class="maincontent">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td>
                                <font size="+1"><b>${emails[0].headers.Subject}</b></font><br>
                                <font size="-1" color="#777">${emails.length} messages</font>
                            </td>
                        </tr>
                    </table>`;

                    htmlContent += emails.map((email:any) => {
                        //console.log("inner email",email)
                        let [senderName, senderEmail] = extractEmailParts(email.headers.From);
                        let [recipientName, recipientEmail] = extractEmailParts(email.headers.To);
                        //console.log("senderEmail email",senderEmail)
                        //console.log("recipientEmail email",recipientEmail)

                        // replace Email with can
                        if (senderEmail.toLowerCase().includes("canned")) {
                            senderEmail = senderEmail.replace(/(\+[^@]*)@/, "@")
                            // console.log("senderEmail",senderEmail)

                        }

                        let senderEmail2 = ' '
                        if(senderEmail){
                            senderEmail2 = senderEmail
                        }else{
                            senderEmail2 = senderName
                        }

                        if(client_proof_info[senderEmail]) {
                            console.log("client_proof_info",client_proof_info[senderEmail])
                            finalThread[threadId].client_code = client_proof_info[senderEmail].client_code;
                            finalThread[threadId].client_email = client_proof_info[senderEmail].client_email;
                            finalThread[threadId].pre_trade_proof_id = client_proof_info[senderEmail].pre_trade_proof_id;
                            finalThread[threadId].emails = emails
                        }

                        return `<hr>
                <table width="100%" cellpadding="0" cellspacing="0" class="message">
                    <tr>
                        <td><font size="-1"><b>${senderName}</b> &lt;${senderEmail2}&gt;</font></td>
                        <td align="right"><font size="-1">${formatDate(email.headers.Date)}</font></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-bottom: 4px;">
                            <font size="-1" class="recipient">
                                <div>To: ${recipientName} ${recipientEmail ? `&lt;${recipientEmail}&gt;` : ''}</div>
                            </font>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <table width="100%" cellpadding="12" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="overflow: hidden;">
                                            <font size="-1">${email.body}</font>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`;
                    }).join('');

                    htmlContent += `</div></div></body></html>`;

                    const email_url = await notificationService.generatePreTradeEmailPdfClientWise(1, { htmlContent, client_code: finalThread[threadId].client_code });
                    finalThread[threadId].email_url = email_url
                    console.log(email_url)
                    await tradeProofsModel.update_pre_trade_proofs({email_url:email_url},finalThread[threadId].pre_trade_proof_id);
                }
                return true;
            })
        );

        // // Iterate and update each object in the data structure
        // Object.values(finalThread).forEach(({ email_url, pre_trade_proof_id }) => {
        //     console.log(`email_url: ${email_url}, pre_trade_proof_id: ${pre_trade_proof_id}`);
        // });

        return true;
    } catch(error: any) {
        console.log(error)
        return  true;
    }

};

// Function to generate PDF from HTML using Puppeteer
const generatePDF_1 = async (htmlContent: string) => {
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

    const file_name = `${123}_trade_info_${moment().format('DD_MM_YYYY_HH-mm-ss')}.pdf`;
    const uploadDir = path.join(__dirname, '../../../../public/upload'); // Create directory path relative to the current script
    const file_path = path.join(uploadDir, file_name);

    console.log(uploadDir,file_path);

    await page.pdf({ path: file_path, format: 'A4', printBackground: true });

    // Close the browser
    await browser.close();


    const aws_s3_url = await fileService.uploadPdfFileToS3Bucket(1,{file_name,file_path})

    //fs.unlinkSync(file_path);
    return aws_s3_url;
};

const generatePDF = async (htmlContent: string, outputPath: string) => {
    console.log(outputPath)
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true
    });

    await browser.close();
    console.log(`PDF saved: ${outputPath}`);
};

function formatDate(dateString: string) {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
}

/*
// Function to generate PDF from HTML using Puppeteer
const processingThreadAndClientProof = async (threads: any,client_proof_info:any) => {
    const extractEmailParts = (headerValue: string) => {
        const match = headerValue.match(/(.*?)\s*<(.*)>/);
        return match ? [match[1].trim(), match[2]] : [headerValue, ''];
    };
    const finalThread = {} as any
    await Promise.all(
        Object.entries(threads).map(async ([threadId, emails]) => {
            const emailList = emails as any;
            finalThread[threadId] = {
                thread_id : threadId,
                emails: [] as any
            } as any;
            // Sort emails by date (oldest to newest)
            emailList.sort((a:any, b:any) => new Date(a.headers.Date).getTime() - new Date(b.headers.Date).getTime());

            if(emailList.length > 1 ) {
                emailList.map((email:any) => {
                    let [senderName, senderEmail] = extractEmailParts(email.headers.From);
                    let [recipientName, recipientEmail] = extractEmailParts(email.headers.To);
                    // replace Email with can
                    if (senderEmail.toLowerCase().includes("canned")) {
                        senderEmail = senderEmail.replace(/(\+[^@]*)@/, "@")
                        // console.log("senderEmail",senderEmail)
                    }

                    if(client_proof_info[senderEmail]) {
                        console.log("client_proof_info",client_proof_info[senderEmail])
                        finalThread[threadId].client_code = client_proof_info[senderEmail].client_code;
                        finalThread[threadId].client_email = client_proof_info[senderEmail].client_email;
                        finalThread[threadId].pre_trade_proof_id = client_proof_info[senderEmail].pre_trade_proof_id;
                        finalThread[threadId].emails = emails
                    }
                    // console.log("recipientName",recipientName,recipientEmail)
                    return true
                });
            }
            return true;
        })
    );
    return finalThread
};

const processingThreadAndClientEmail = async (threads: any) => {

    const extractEmailParts = (headerValue: string) => {
        const match = headerValue.match(/(.*?)\s*<(.*)>/);
        return match ? [match[1].trim(), match[2]] : [headerValue, ''];
    };

    await Promise.all(
        Object.entries(threads).map(async ([threadId, emails]) => {
            const emailList = emails as any;

            emailList.sort((a:any, b:any) => new Date(a.headers.Date).getTime() - new Date(b.headers.Date).getTime());

            if(emailList.length > 1) {
                const [namePart, emailPart] = extractEmailParts(emailList[0].headers.From);
                let emailPart2 = ' '
                if(!emailPart){
                    emailPart2 = namePart
                }else{
                    emailPart2 = emailPart
                }
                let htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Gmail - ${emailList[0].headers.Subject}</title>

                <style>
        body, td, div, p, a, input { font-family: arial, sans-serif; }
        body, td { font-size: 13px; }
        a:link, a:active { color: #1155CC; text-decoration: none; }
        a:hover { text-decoration: underline; cursor: pointer; }
        img { border: 0px; }
        pre { white-space: pre-wrap; word-wrap: break-word; max-width: 800px; overflow: auto; }
        .logo { left: -7px; position: relative; }
    </style>
    </head>
    <body>
        <div class="bodycontainer">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr height="14px">
                    <td width="143">
                        <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_server_1x.png" width="143" height="59" alt="Gmail" class="logo">
                    </td>
                    <td align="right">
                        <font size="-1" color="#777"><b>${namePart}</b> &lt;${emailPart2}&gt;</font>
                    </td>
                </tr>
            </table>
            <hr>
            <div class="maincontent">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <font size="+1"><b>${emails[0].headers.Subject}</b></font><br>
                            <font size="-1" color="#777">${emails.length} messages</font>
                        </td>
                    </tr>
                </table>`;

                htmlContent += emailList.map((email:any) => {
                    //console.log("inner email",email)
                    let [senderName, senderEmail] = extractEmailParts(email.headers.From);
                    let [recipientName, recipientEmail] = extractEmailParts(email.headers.To);
                    //console.log("senderEmail email",senderEmail)
                    //console.log("recipientEmail email",recipientEmail)

                    // replace Email with can

                    let senderEmail2 = ' '
                    if(senderEmail){
                        senderEmail2 = senderEmail
                    }else{
                        senderEmail2 = senderName
                    }
                    return `<hr>
            <table width="100%" cellpadding="0" cellspacing="0" class="message">
                <tr>
                    <td><font size="-1"><b>${senderName}</b> &lt;${senderEmail2}&gt;</font></td>
                    <td align="right"><font size="-1">${formatDate(email.headers.Date)}</font></td>
                </tr>
                <tr>
                    <td colspan="2" style="padding-bottom: 4px;">
                        <font size="-1" class="recipient">
                            <div>To: ${recipientName} ${recipientEmail ? `&lt;${recipientEmail}&gt;` : ''}</div>
                        </font>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <table width="100%" cellpadding="12" cellspacing="0">
                            <tr>
                                <td>
                                    <div style="overflow: hidden;">
                                        <font size="-1">${email.body}</font>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>`;
                }).join('');

                htmlContent += `</div></div></body></html>`;

                const email_url = await notificationService.generatePreTradeEmailPdfClientWise(1, { htmlContent, client_code: 123 });
                console.log(email_url)
                await tradeProofsModel.update_pre_trade_proofs({email_url:email_url},finalThread[threadId].pre_trade_proof_id);
            }
            return true;
        })
    );
};
*/

export default {
    read_email:read_email,
    read_email_auto:read_email_auto
}
