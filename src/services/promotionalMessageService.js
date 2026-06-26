const nodemailer = require('nodemailer');
const CustomerModel = require('../models/customer');             // add this
const interactionModel = require('../models/interaction');           // add this
const { generateOnboardingHTML } = require('../templates/onboardingTemplate');
const subscriberService = require('./subscriberService'); 

const loadEmailBody = (customer = {}) => {
  if(typeof generateOnboardingHTML !== 'function') {
    throw new Error('Unable to load onboarding email template');
  }
  return generateOnboardingHTML(customer);
};

const sendPromotionalEmails = async (customerData, subject) => {
  try {
    const { EMAIL_USER_ID, EMAIL_USER_PASSCODE } = process.env;
    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      throw new Error('Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined');
    }

    if(!customerData || !customerData.customerid) {
      throw new Error('Customer ID is required to send promotional email');
    }

    const subscriber = await subscriberService.getSubscriberByCustomerId(customerData.customerid);

    if(!subscriber || subscriber.issubscribe !== true || subscriber.emailpermstatus !== true) {
      return {
        success: true,
        skipped: true,
        message: 'Email skipped due to subscriber opt-out or permission settings',
        data: null,
      };
    }

    // If you're sending one personalised email to customerData:
    const promotionalHtml = loadEmailBody(customerData);

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

    const customerId =
      customerData.customerId || customerData.customerid || customerData.customerID;

    if (customerId) {
      try {
        await interactionModel.createInteraction({
          customerid: customerId,
          interactionmode: 'EMAIL',
          interactiontype: 'PROMOTIONAL',
          interactionvalue: customerData.title || customerData.message || 'PROMOTIONAL_EMAIL',
        });
    } catch (interactionError) {
      console.error('Failed to record promotional interaction:', interactionError.message);
    }
  }
    return { success: true, message: 'Promotional email sent successfully', data: result };
  } catch (error) {
    console.error('Failed to send promotional email:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = { sendPromotionalEmails, loadEmailBody };
