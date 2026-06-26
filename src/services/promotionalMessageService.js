const { transporter, EMAIL_USER_ID, EMAIL_USER_PASSCODE } = require('../config/email');
const CustomerModel = require('../models/customer');             // add this
const { generateOnboardingHTML } = require('../templates/onboardingTemplate');

const sendPromotionalEmails = async (customerData, subject) => {
  try {
    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      throw new Error('Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined');
    }

    // If you're sending one personalised email to customerData:
    const promotionalHtml = generateOnboardingHTML(customerData);

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
