const nodemailer = require('nodemailer');
const { generateOnboardingHTML } = require('../templates/onboardingTemplate');

/**
 * Build the personalised onboarding HTML and dispatch the welcome email.
 *
 * @param {Object} customerData – { firstname, lastname, emailadd, city }
 * @param {string} subject      – email subject line
 * @returns {Promise<Object>}   – { success, message, data? }
 */
const sendPromotionalEmails = async (customerData, subject) => {
  try {
    const { EMAIL_USER_ID, EMAIL_USER_PASSCODE } = process.env;
    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      throw new Error('Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined');
    }

    const promotionalHtml = generateOnboardingHTML(customerData);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER_ID, pass: EMAIL_USER_PASSCODE },
    });

    const mailOptions = {
      from: EMAIL_USER_ID,
      to: customerData.emailadd,
      subject,
      html: promotionalHtml,
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, message: 'Promotional email sent successfully', data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = { sendPromotionalEmails };
