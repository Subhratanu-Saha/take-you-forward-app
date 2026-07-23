const { transporter, EMAIL_USER_ID, EMAIL_USER_PASSCODE } = require('../config/email');
const SubscriberModel = require('../models/subscriber');
const interactionModel = require('../models/interaction');
const prisma = require('../utils/db');
const { generateOnboardingHTML } = require('../templates/onboardingTemplate');
const generateRandomAlphaNumeric = require('../utils/idGenerator');

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

const generateDlqId = () => `DLQ-${Date.now()}-${generateRandomAlphaNumeric(6)}`;

const normalizeCustomerId = (customerData) => {
  if (!customerData || typeof customerData !== 'object') {
    return null;
  }

  return customerData.customerId || customerData.customerid || customerData.customerID || null;
};

const createDlqEntry = async (customerData, subject, error, attemptCount = 1) => {
  const customerId = normalizeCustomerId(customerData);
  const payload = customerData && typeof customerData === 'object' ? customerData : {};

  try {
    const record = await prisma.promotionaldlq.create({
      data: {
        eventid: generateDlqId(),
        customerid: customerId,
        emailaddress: payload.emailaddress || payload.emailadd || null,
        subject: subject || 'PROMOTIONAL_EMAIL',
        payload,
        errormessage: error?.message || String(error),
        attemptcount: attemptCount,
        status: 'PENDING',
        createdat: new Date(),
        updatedat: new Date(),
        lastattemptat: new Date(),
        nextretryat: new Date(Date.now() + RETRY_DELAY_MS),
      },
    });

    console.error(`[PROMOTIONAL_DLQ] Stored failed promotional event ${record.eventid}`);
    return record;
  } catch (dlqError) {
    console.error(`[PROMOTIONAL_DLQ] Could not persist failed promotional event: ${dlqError.message}`);
    return null;
  }
};

const sendPromotionalEmails = async (customerData, subject, options = {}) => {
  const { shouldQueueOnFailure = true, skipDlqRecord = false } = options;

    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      throw new Error('Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined');
    }

    if (!customerData || !customerData.customerid) {
      throw new Error('Customer ID is required to send promotional email');
    }

    const subscriber = await SubscriberModel.getSubscriberByCustomerId(customerData.customerid);

     if (!subscriber || subscriber.issubscribe !== true || subscriber.emailpermstatus !== true) {
      return {
        success: true,
        skipped: true,
        message: 'Email skipped due to subscriber opt-out or permission settings',
        data: null,
     };
    }

    const recipientEmail = customerData.emailaddress || customerData.emailadd || null;

    if (!recipientEmail) {
      return {
    success: true,
    skipped: true,
    message: 'Email skipped: no recipient email provided',
    data: null,
  };
}
    const promotionalHtml = generateOnboardingHTML(customerData);

    const mailOptions = {
      from: EMAIL_USER_ID,
      to: recipientEmail,
      subject,
      html: promotionalHtml,
    };

    try {

    const result = await transporter.sendMail(mailOptions);

    if (
      !result ||
      !result.messageId ||
      !Array.isArray(result.accepted) ||
      result.accepted.length === 0
    ) {
      throw new Error(`Email transport reported failure: ${JSON.stringify(result)}`);
    }

    const customerId = normalizeCustomerId(customerData);
    if (customerId) {
      try {
        await interactionModel.createInteraction({
          customerid: customerId,
          interactionmode: 'EMAIL',
          interactiontype: 'PROMOTIONAL',
          interactionvalue: 'PROMOTIONAL_EMAIL',
        });
      } catch (interactionError) {
        console.error('Failed to record promotional interaction:', interactionError.message);
      }
    }

    return { success: true, message: 'Promotional email sent successfully', data: result };
  } catch (mailError) {
    console.error('Failed to send promotional email:', mailError.message);

    if (shouldQueueOnFailure && !skipDlqRecord) {
      await createDlqEntry(customerData, subject, mailError);
    }

    return { success: false, message: mailError.message };
  }
};

const getFailedPromotionalEvents = async () => {
  return prisma.promotionaldlq.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdat: 'asc' },
  });
};

const retryFailedPromotionalEvents = async () => {
  const pendingEvents = await prisma.promotionaldlq.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { nextretryat: null },
        { nextretryat: { lte: new Date() } },
      ],
    },
    orderBy: [
      { nextretryat: 'asc' },
      { createdat: 'asc' },
    ],
    take: 50,
  });

  const results = [];

  for (const event of pendingEvents) {
    try {
      const payload = typeof event.payload === 'object' && event.payload !== null ? event.payload : {};

      const result = await sendPromotionalEmails(payload, event.subject, {
        shouldQueueOnFailure: false,
        skipDlqRecord: true,
      });

      if (result.success) {
        await prisma.promotionaldlq.update({
          where: { eventid: event.eventid },
          data: {
            status: 'SENT',
            updatedat: new Date(),
            lastattemptat: new Date(),
          },
        });

        results.push({ eventId: event.eventid, status: 'retried' });
      } else {
        const nextAttemptCount = event.attemptcount + 1;
        const shouldMarkFailed = nextAttemptCount >= MAX_RETRY_ATTEMPTS;

        await prisma.promotionaldlq.update({
          where: { eventid: event.eventid },
          data: {
            attemptcount: nextAttemptCount,
            errormessage: result.message,
            status: shouldMarkFailed ? 'FAILED' : 'PENDING',
            updatedat: new Date(),
            lastattemptat: new Date(),
            nextretryat: shouldMarkFailed ? null : new Date(Date.now() + RETRY_DELAY_MS),
          },
        });

        results.push({
          eventId: event.eventid,
          status: shouldMarkFailed ? 'failed' : 'queued',
          message: result.message,
        });
      }
    } catch (retryError) {
      console.error(`[PROMOTIONAL_DLQ] Retry failed for ${event.eventid}: ${retryError.message}`);

      await prisma.promotionaldlq.update({
        where: { eventid: event.eventid },
        data: {
          attemptcount: event.attemptcount + 1,
          errormessage: retryError.message,
          status: event.attemptcount + 1 >= MAX_RETRY_ATTEMPTS ? 'FAILED' : 'PENDING',
          updatedat: new Date(),
          lastattemptat: new Date(),
          nextretryat:
            event.attemptcount + 1 >= MAX_RETRY_ATTEMPTS
              ? null
              : new Date(Date.now() + RETRY_DELAY_MS),
        },
      });

      results.push({
        eventId: event.eventid,
        status: 'failed',
        message: retryError.message,
      });
    }
  }

  return results;
};

module.exports = {
  sendPromotionalEmails,
  getFailedPromotionalEvents,
  retryFailedPromotionalEvents,
};