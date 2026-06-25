const nodemailer = require('nodemailer');
const CustomerModel = require('../models/customer');
const SubscriberModel = require('../models/subscriber');
const { generateOnboardingHTML } = require('../templates/onboardingTemplate');

const sendPromotionalEmails = async (customerData, subject) => {
  try {
    const { EMAIL_USER_ID, EMAIL_USER_PASSCODE } = process.env;

    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      throw new Error(
        'Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined'
      );
    }

    // Verify subscriber status before sending promotional email
    const subscriber = await SubscriberModel.getSubscriberByCustomerId(
      customerData.customerid
    );

    if (
      !subscriber ||
      subscriber.isSubscribe !== true ||
      subscriber.emailPermStatus !== true
    ) {
      console.log(
        `Promotional email blocked for customer ${customerData.customerid} (${customerData.emailadd})`
      );

      return {
        success: false,
        message:
          'Customer has unsubscribed or email permission is not active. Promotional email not sent.',
      };
    }

    const promotionalHtml = generateOnboardingHTML(customerData);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER_ID,
        pass: EMAIL_USER_PASSCODE,
      },
    });

    const mailOptions = {
      from: EMAIL_USER_ID,
      to: customerData.emailadd,
      subject,
      html: promotionalHtml,
    };

    const result = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Promotional email sent successfully',
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