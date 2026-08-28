const nodemailer = require('nodemailer');
const dns = require('dns');

const EMAIL_USER_ID = process.env.EMAIL_USER_ID ? process.env.EMAIL_USER_ID.trim() : '';
const EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE ? process.env.EMAIL_USER_PASSCODE.trim() : '';

dns.setDefaultResultOrder('ipv4first');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  family:4,
  auth: {
    user: EMAIL_USER_ID,
    pass: EMAIL_USER_PASSCODE,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const verifyEmailConfig = async () => {
  const isDev = process.env.NODE_ENV === 'development';

  if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
    if (isDev) {
      console.warn('⚠️ WARNING: Email configuration is missing. EMAIL_USER_ID and/or EMAIL_USER_PASSCODE are not set in the environment.');
      return false;
    } else {
      console.error('❌ CRITICAL: Email configuration is missing in non-development environment.');
      throw new Error('Email configuration (EMAIL_USER_ID, EMAIL_USER_PASSCODE) is missing.');
    }
  }

  try {
    await transporter.verify();
    console.log('✅ Email transporter is ready to send messages');
    return true;
  } catch (error) {
    if (isDev) {
      console.warn(`⚠️ WARNING: Email transporter verification failed: ${error.message}`);
      return false;
    } else {
      console.error(`❌ CRITICAL: Email transporter verification failed: ${error.message}`);
      throw error;
    }
  }
};

module.exports = {
  transporter,
  verifyEmailConfig,
  EMAIL_USER_ID,
  EMAIL_USER_PASSCODE,
};
