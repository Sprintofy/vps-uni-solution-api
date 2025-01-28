'use strict';
import CONSTANTS from '../common/constants/constants';
import moment from "moment/moment";
import path from "path";
import fs from "fs";
import clientTradeModel from "../models/preTrade.model";
import axios from "axios";
import fileService from "./common/file.service";
import Imap from "imap-simple";
import { simpleParser } from 'mailparser'; // This is optional, only if you need to parse email bodies

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

const read_email = async (req: any) => {
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

export default {
    read_email:read_email

}
