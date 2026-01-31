// /Users/digitalflakeadmin/Desktop/vps-uni-solution-api/src/services/utilities/email.service.ts
"use strict";
import nodemailer from "nodemailer";
import imap from "imap-simple";
import organizationConfigModel from "../../models/organizationConfig.model";
import { google } from "googleapis";
import CONFIGS from "../../config";
import path from "path";
import axios from "axios";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const createTransporter = async (organization_id: any) => {
  const organizations_config =
    await organizationConfigModel.fetchOrganizationConfig(organization_id);
  // Create transporter
  const transporter = nodemailer.createTransport(
    organizations_config[0].email_config,
  );

  return transporter;
};

const fetchImapConfig = (organization_id: any) => {
  // todo daynamic Organization email fetch
  return {
    imap: {
      user: "pravinjagtap2151@gmail.com",
      password: "ivng kkqn fmba qlki",
      host: "imap.gmail.com", // e.g., imap.gmail.com for Gmail
      port: 993,
      tls: true,
      authTimeout: 3000,
      //debug: console.log,
      tlsOptions: {
        rejectUnauthorized: false, // Disables certificate validation
      },
    },
  };
};

const sendEmail = async (organization_id: any, mailOptions: any) => {
  try {
    // Create a dynamic transporter based on organization_id
    const transporter = await createTransporter(organization_id);
    // Send the email
    const results = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully..!!`, results);
    return true;
  } catch (error: any) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendOrganizationWiseEmail = async (
  organization_id: any,
  mailOptions: any,
) => {
  try {
    // Create a dynamic transporter based on organization_id

    const transporter = await createTransporter(organization_id);
    // Send the email
    const results = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully..!!-->`, mailOptions.to);
    return results;
  } catch (error: any) {
    console.error("Error Sending Email:", error);
    return false;
  }
};

const readOrganizationWiseEmail = async (
  organization_id: any,
  mailOptions: any,
) => {
  try {
    console.log(`Email read start for organization_id: ${organization_id}`);

    // Fetch the IMAP configuration dynamically
    const config = await fetchImapConfig(organization_id);
    // console.log('Fetched IMAP config:', config);

    // Connect to IMAP server
    const connection = await imap.connect(config);
    //console.log('Connected to IMAP server.');

    // Open the INBOX
    await connection.openBox("INBOX");
    //console.log('Opened INBOX successfully.');

    // Define search criteria and fetch options
    const searchCriteria = ["ALL", ["SINCE", "Jan 10, 2025"]];
    const fetchOptions = { bodies: ["HEADER"], struct: true };

    //console.log('Fetch options:', fetchOptions,searchCriteria);

    // Fetch messages
    const messages = await connection.search(searchCriteria, fetchOptions);

    // Filter messages by subject
    // Filter messages by subject
    const filteredMessages = messages.filter((message: any) => {
      const headerPart = message.parts.find(
        (part: any) => part.which === "HEADER",
      );
      if (!headerPart || !headerPart.body) return false;
      const subject = headerPart.body.subject ? headerPart.body.subject[0] : "";
      return subject.includes("pre Trade");
    });

    // console.log(`Fetched ${messages.length} messages.`, messages,filteredMessages);

    // Process the filtered messages to read the content
    for (const message of messages) {
      // console.log(`Received ${messages.length} messages.`, JSON.stringify(message));
      const messageParts = message.parts;
      //console.log("messageParts",messageParts[0].body)
      // Parse the full content using simpleParser for better readability (if needed)
      const bodyStream = messageParts.find(
        (part: any) => part.which && part.body,
      ) as any;
      if (bodyStream?.body) {
        console.log("Email Body:", bodyStream.body);
      } else if (bodyStream?.content) {
        console.log("Email Content:", bodyStream.content.toString("utf-8"));
      } else {
        console.error("Email body not found.");
      }
      // await parseEmail(bodyStream);
    }
    console.log("Email read successfully:", filteredMessages);
    return true;
  } catch (error: any) {
    console.error("Error reading email:", error.message, error.stack);
    return false;
  }
};

// Google Auth Code

// Generate OAuth URL
const generateAuthUrl = async (organization_id: string) => {
  const oAuth2Client = new google.auth.OAuth2(
    CONFIGS.GOOGLE_AUTH.WEB.CLIENT_ID,
    CONFIGS.GOOGLE_AUTH.WEB.CLIENT_SECRETE,
    CONFIGS.GOOGLE_AUTH.WEB.REDIRECT_URIS[0],
  );
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    redirect_uri: CONFIGS.GOOGLE_AUTH.WEB.REDIRECT_URIS[1],
  });
  return authUrl;
};

// Exchange Code for Tokens
const exchangeCodeForTokens = async (code: any) => {
  const oAuth2Client = new google.auth.OAuth2(
    CONFIGS.GOOGLE_AUTH.WEB.CLIENT_ID,
    CONFIGS.GOOGLE_AUTH.WEB.CLIENT_SECRETE,
    CONFIGS.GOOGLE_AUTH.WEB.REDIRECT_URIS[1],
  );
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
};

// Authenticate a client using saved tokens
const authenticateGoogleAuth = async (organization_id: number) => {
  try {
    // const token = await generateGoogleAuthTokens('code')
    const oAuth2Client = new google.auth.OAuth2(
      CONFIGS.GOOGLE_AUTH.WEB.CLIENT_ID,
      CONFIGS.GOOGLE_AUTH.WEB.CLIENT_SECRETE,
      CONFIGS.GOOGLE_AUTH.WEB.REDIRECT_URIS[0],
    );
    // oAuth2Client.setCredentials(JSON.parse(token));
    oAuth2Client.setCredentials({
      access_token: CONFIGS.GOOGLE_AUTH.WEB.ACCESS_TOKEN,
      refresh_token: CONFIGS.GOOGLE_AUTH.WEB.REFRESH_TOKEN,
    });
    return oAuth2Client;
  } catch (error: any) {
    throw new Error("Client not authenticated. Please log in.");
  }
};

const authenticateGoogleAuth2 = async (organization_id: number) => {
  try {
    // Create OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
      CONFIGS.GOOGLE_AUTH.WEB.CLIENT_ID,
      CONFIGS.GOOGLE_AUTH.WEB.CLIENT_SECRETE,
      CONFIGS.GOOGLE_AUTH.WEB.REDIRECT_URIS[0],
    );

    // Make a POST request to get a new access token using the refresh token
    const tokenResponse: any = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: CONFIGS.GOOGLE_AUTH.WEB.CLIENT_ID,
        client_secret: CONFIGS.GOOGLE_AUTH.WEB.CLIENT_SECRETE,
        refresh_token: CONFIGS.GOOGLE_AUTH.WEB.REFRESH_TOKEN,
        grant_type: "refresh_token",
      },
    );

    const { access_token } = tokenResponse.data;

    oAuth2Client.setCredentials({
      access_token,
      refresh_token: CONFIGS.GOOGLE_AUTH.WEB.REFRESH_TOKEN,
    });

    return oAuth2Client;
  } catch (error: any) {
    console.error("Error authenticating Google client:", error);
    // Handle invalid_grant error
    if (
      error.response &&
      error.response.data &&
      error.response.data.error === "invalid_grant"
    ) {
      console.error(
        "Refresh token expired or revoked. Re-authentication required.",
      );
      throw new Error("Refresh token expired. Please log in again.");
    }
    throw new Error("Client not authenticated. Please log in.");
  }
};

export default {
  sendOrganizationWiseEmail: sendOrganizationWiseEmail,
  readOrganizationWiseEmail: readOrganizationWiseEmail,
  authenticateGoogleAuth: authenticateGoogleAuth2,
  generateAuthUrl: generateAuthUrl,
  exchangeCodeForTokens: exchangeCodeForTokens,
};
