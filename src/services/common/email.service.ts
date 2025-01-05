"use strict";
import CONSTANTS from '../../common/constants/constants';
import nodemailer from 'nodemailer';

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
        return true;

    } catch (error: any) {
        console.error('Error sending email:', error);
        return false;
    }
};

export default {

    sendOrganizationWiseEmail:sendOrganizationWiseEmail,
};
