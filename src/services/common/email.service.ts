const env = process.env;
const dotenv = require('dotenv');
import nodemailer from 'nodemailer';
dotenv.config()

class emailService{
    constructor() {
    }

    public async sendEmail (mailOptions:any): Promise<any> {
        // Create a Nodemailer transporter
        console.log('Sending...');
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'pravinjagtap2151@gmail.com',
                pass: 'ivng kkqn fmba qlki'
            },
        });
        try {
            // Send the email
            const results  = await transporter.sendMail(mailOptions);
            console.log(`Email sent successfully..!!`,results);
            return  true;
        } catch (error: any) {
            return  true;
            console.error('Error sending email:', error);
            // throw new Error('Error sending email');

        }
    }
}
export default new emailService()
