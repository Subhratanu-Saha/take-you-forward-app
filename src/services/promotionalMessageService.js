const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const CustomerModel = require("../models/customer");

const loadEmailBody = () => {
    const emailBodyPath = path.resolve(__dirname, "..", "templates", "onboardingTemplate.js");

    if (!fs.existsSync(emailBodyPath)) {
        throw new Error(`Email body file not found at ${emailBodyPath}`);
    }

    const emailBodyModule = require(emailBodyPath);
    const emailBody =
        typeof emailBodyModule === "string"
            ? emailBodyModule
            : emailBodyModule?.html || emailBodyModule?.body || emailBodyModule?.default;

    if (!emailBody || typeof emailBody !== "string") {
        throw new Error(`Invalid email body export from ${emailBodyPath}. Expected a string export or { html, body } object.`);
    }

    return emailBody;
};

const sendPromotionalEmails = async () => {
    try {
        const { EMAIL_USER_ID, EMAIL_USER_PASSCODE } = process.env;

        if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
            throw new Error('Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined');
        }

        const promotionalHtml = loadEmailBody();

        // Get all customer email addresses using the existing model
        const customers = await CustomerModel.getAllCustomers();

        const emailList = (customers || [])
            .map(customer => customer.emailadd)
            .filter(Boolean);

        if (emailList.length === 0) {
            throw new Error("Error ! No customer email addresses found");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER_ID,
                pass: process.env.EMAIL_USER_PASSCODE,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER_ID, // takeyouforward.info@gmail.com
            bcc: emailList,               // all customers
            subject: "Welcome to Take You Forward - Your Journey Starts Here!",
            html: promotionalHtml,
        };

        const result = await transporter.sendMail(mailOptions);

        return {
            success: true,
            message: "Promotional emails sent successfully",
            data: result,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};

module.exports = {
    sendPromotionalEmails,
};