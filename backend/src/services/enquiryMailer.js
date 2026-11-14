const nodemailer = require('nodemailer');

let transporter;

function getMailSettings() {
    const port = Number(process.env.ENQUIRY_SMTP_PORT);
    const frontendUrl = process.env.FRONTEND_URL;
    let frontendOrigin = null;
    if (frontendUrl) {
        try {
            frontendOrigin = new URL(frontendUrl);
        } catch {
            frontendOrigin = null;
        }
    }
    const requiredSettings = [
        process.env.ENQUIRY_SMTP_HOST,
        process.env.ENQUIRY_SMTP_USER,
        process.env.ENQUIRY_SMTP_PASSWORD,
        process.env.ENQUIRY_EMAIL_FROM,
        process.env.ENQUIRY_ADMIN_EMAIL,
        process.env.JWT_SECRET
    ];

    if (
        requiredSettings.some((setting) => !setting)
        || !Number.isInteger(port)
        || port < 1
        || port > 65535
        || !frontendOrigin
        || !['http:', 'https:'].includes(frontendOrigin.protocol)
        || frontendOrigin.username
        || frontendOrigin.password
        || frontendOrigin.pathname !== '/'
        || frontendOrigin.search
        || frontendOrigin.hash
    ) {
        throw new Error('Enquiry email is not configured. Set the SMTP, enquiry email, FRONTEND_URL, and JWT_SECRET environment variables.');
    }

    return {
        adminEmail: process.env.ENQUIRY_ADMIN_EMAIL,
        frontendUrl: frontendOrigin.toString(),
        from: process.env.ENQUIRY_EMAIL_FROM,
        port,
        secure: process.env.ENQUIRY_SMTP_SECURE === 'true',
        smtpHost: process.env.ENQUIRY_SMTP_HOST,
        smtpPassword: process.env.ENQUIRY_SMTP_PASSWORD,
        smtpUser: process.env.ENQUIRY_SMTP_USER
    };
}

function getTransport(settings) {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.port,
            secure: settings.secure,
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPassword
            }
        });
    }
    return transporter;
}

function createConversationUrl(frontendUrl, token) {
    return new URL(`/enquiry/chat/${token}`, frontendUrl).toString();
}

async function sendEmail({ to, subject, text }) {
    const settings = getMailSettings();
    return getTransport(settings).sendMail({
        from: settings.from,
        to,
        subject,
        text
    });
}

module.exports = { createConversationUrl, getMailSettings, sendEmail };
