const nodemailer = require("nodemailer");
const { generateOnboardingHTML } = require("../templates/onboardingTemplate");

const sendPromotionalEmails = async (customerData, subject ) => {
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

        // Call the template function to retrieve the email body for the specific customer
        const promotionalHtml = generateOnboardingHTML(customerData);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER_ID,
                pass: EMAIL_USER_PASSCODE,
            },
        });

        const mailOptions = {
            from: EMAIL_USER_ID,
            to: customerData.emailadd,
            subject: subject,
            html: promotionalHtml,
        };

        const result = await transporter.sendMail(mailOptions);

        return {
            success: true,
            message: "Promotional email sent successfully",
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