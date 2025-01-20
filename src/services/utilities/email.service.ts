"use strict";
import CONSTANTS from '../../common/constants/constants';
import nodemailer from 'nodemailer';
import imap from 'imap-simple';
import fetch from "nodemailer/lib/fetch";
import {MailParser, simpleParser} from "mailparser";

const createTransporter = (organization_id: any) => {

    // todo daynamic Organization email fetch

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'pravinjagtap2151@gmail.com',
            pass: 'ivng kkqn fmba qlki',
        },
    });

    return transporter;
};

const fetchImapConfig = (organization_id: any) => {

    // todo daynamic Organization email fetch
    return {
        imap: {
            user: 'pravinjagtap2151@gmail.com',
            password: 'ivng kkqn fmba qlki',
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

const sendEmail = async (organization_id: any, mailOptions: any) => {
    try {
        // Create a dynamic transporter based on organization_id
        const transporter = createTransporter(organization_id);
        // Send the email
        const results = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully..!!`, results);
        return true;
    } catch (error: any) {
        console.error('Error sending email:', error);
        return false;
    }
};

const sendOrganizationWiseEmail = async (organization_id: any,mailOptions: any) => {
    try {
        // Create a dynamic transporter based on organization_id

        const transporter = createTransporter(organization_id);
        // Send the email
        const results = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully..!!-->`,mailOptions.to);
        return results;
    } catch (error: any) {
        console.error('Error sending email:', error);
        return false;
    }
};

const readOrganizationWiseEmail = async (organization_id: any, mailOptions: any) => {
    try {
        console.log(`Email read start for organization_id: ${organization_id}`);

        // Fetch the IMAP configuration dynamically
        const config = await fetchImapConfig(organization_id);
        // console.log('Fetched IMAP config:', config);

        // Connect to IMAP server
        const connection = await imap.connect(config);
        //console.log('Connected to IMAP server.');

        // Open the INBOX
        await connection.openBox('INBOX');
        //console.log('Opened INBOX successfully.');


        // Define search criteria and fetch options
        const searchCriteria = [ 'ALL', ['SINCE', 'Jan 10, 2025']];
        const fetchOptions = { bodies: ['HEADER'], struct: true };

        //console.log('Fetch options:', fetchOptions,searchCriteria);

        // Fetch messages
        const messages = await connection.search(searchCriteria, fetchOptions);

        // Filter messages by subject
        // Filter messages by subject
        const filteredMessages = messages.filter((message: any) => {
            const headerPart = message.parts.find((part: any) => part.which === 'HEADER');
            if (!headerPart || !headerPart.body) return false;
            const subject = headerPart.body.subject ? headerPart.body.subject[0] : '';
            return subject.includes('pre Trade');
        });

        // console.log(`Fetched ${messages.length} messages.`, messages,filteredMessages);

        // Process the filtered messages to read the content
        for (const message of messages) {
           // console.log(`Received ${messages.length} messages.`, JSON.stringify(message));
            const messageParts = message.parts;
            //console.log("messageParts",messageParts[0].body)
            // Parse the full content using simpleParser for better readability (if needed)
            const bodyStream = messageParts.find((part: any) => part.which && part.body) as any;
            if (bodyStream?.body) {
                console.log('Email Body:', bodyStream.body);
            } else if (bodyStream?.content) {
                console.log('Email Content:', bodyStream.content.toString('utf-8'));
            } else {
                console.error('Email body not found.');
            }
           // await parseEmail(bodyStream);
        }
        console.log('Email read successfully:', filteredMessages);
        return true;


    } catch (error: any) {
        console.error('Error reading email:', error.message, error.stack);
        return false;
    }
};

function processMessage(msg:any, seqno:any) {
    console.log("Processing msg #" + seqno);
    // console.log(msg);

    var parser = new MailParser();
    parser.on("headers", function(headers) {
        console.log("Header: " + JSON.stringify(headers));
    });

    parser.on('data', data => {
        if (data.type === 'text') {
            console.log(seqno);
            console.log(data.text);  /* data.html*/
        }

        // if (data.type === 'attachment') {
        //     console.log(data.filename);
        //     data.content.pipe(process.stdout);
        //     // data.content.on('end', () => data.release());
        // }
    });

    msg.on("body", function(stream:any) {
        stream.on("data", function(chunk:any) {
            parser.write(chunk.toString("utf8"));
        });
    });
    msg.once("end", function() {
        // console.log("Finished msg #" + seqno);
        parser.end();
    });
}


export default {

    sendOrganizationWiseEmail: sendOrganizationWiseEmail,
    readOrganizationWiseEmail: readOrganizationWiseEmail
};
