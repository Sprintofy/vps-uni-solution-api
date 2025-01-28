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

        // Connect to IMAP server
        const connection = await Imap.connect(config);
        console.log('Connected to IMAP server.');

        // Open the INBOX
        await connection.openBox('INBOX');
        console.log('Opened INBOX successfully.');

        // Define search criteria
        const searchCriteria = ['ALL', ['SINCE', 'Jan 10, 2025']];

        // Fetch options to get the full raw email data
        const fetchOptions = { bodies: [''], struct: true }; // Use an empty string to fetch full raw data
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (!messages || messages.length === 0) {
            console.log('No messages found matching the criteria.');
            return false;
        }

        console.log(`Fetched ${messages.length} messages.`);

        // Save each email as a .eml file
        for (const message of messages) {
            try {
                const uid = message.attributes.uid; // Unique ID of the email
                const rawPart = message.parts.find((part: any) => part.which === ''); // Fetch raw data part

                if (rawPart && rawPart.body) {
                    console.log(rawPart)
                    const fileName = `email-${uid}.eml`;
                    require('fs').writeFileSync(fileName, rawPart.body, 'utf-8'); // Save as .eml file
                    console.log(`Saved email as ${fileName}`);
                } else {
                    console.error(`No raw email part found for UID ${uid}`);
                }
            } catch (messageError:any) {
                console.error(`Error processing message UID ${message.attributes.uid}:`, messageError.message);
            }
        }

        console.log('Email read and saved successfully.');
        return true;
    } catch (error: any) {
        console.error('Error reading email:', error.message, error.stack);
        return false;
    }
};

export default {
    read_email:read_email

}
