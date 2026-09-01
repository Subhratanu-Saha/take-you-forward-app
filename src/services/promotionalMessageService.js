const { transporter, EMAIL_USER_ID, EMAIL_USER_PASSCODE } = require('../config/email');
const SubscriberModel = require('../models/subscriber');
const interactionModel = require('../models/interaction');
const prisma = require('../utils/db');
const { generateOnboardingHTML } = require('../templates/onboardingTemplate');
const {generatePromotionalEmailHTML} = require('../templates/promotionalEmailTemplate');
const generateRandomAlphaNumeric = require('../utils/idGenerator');
const auditService = require('./auditService');



const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    console.error(`[PROMOTIONAL_DLQ] Stored failed promotional event ${record.eventid} for customer=${customerId || 'unknown'}`);
    return record;
  } catch (dlqError) {
    console.error(`[PROMOTIONAL_DLQ] Could not persist failed promotional event for customer=${customerId || 'unknown'}: ${dlqError.message}`);
    return null;
  }
};

const sendPromotionalEmails = async (customerData, subject, options = {}) => {
  const { shouldQueueOnFailure = true, skipDlqRecord = false, campaignId = null, emailType = 'onboarding' } = options;
  const customerId = normalizeCustomerId(customerData) || customerData?.customerid || null;
  const recipientEmail = customerData?.emailaddress || customerData?.emailadd || null;

  console.info(`[PROMOTIONAL] Starting promotional email workflow for customer=${customerId || 'unknown'} subject=${subject || 'PROMOTIONAL_EMAIL'}`);

  try {
    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      const configError = new Error('Missing required email configuration: EMAIL_USER_ID and EMAIL_USER_PASSCODE must both be defined');
      configError.statusCode = 401;
      console.error(`[PROMOTIONAL] ${configError.message}`);
      throw configError;
    }

    if (!customerData || (!customerData.customerid && !customerId)) {
      const validationError = new Error('Customer ID is required to send promotional email');
      console.warn(`[PROMOTIONAL] ${validationError.message} for subject=${subject || 'PROMOTIONAL_EMAIL'}`);
      throw validationError;
    }

    let alreadySent = false;
    if (campaignId) {
      alreadySent = await interactionModel.hasPromotionalCampaignInteraction(customerId, campaignId);
    }

    if (alreadySent) {
      console.info(`[PROMOTIONAL] Skipping duplicate campaign=${campaignId} customer=${customerId}`);
      return {
        success: true,
        skipped: true,
        message: 'Email skipped: campaign already sent to customer',
        data: null,
      };
    }

    const subscriber = await SubscriberModel.getSubscriberByCustomerId(customerId || customerData.customerid);

    if (!subscriber || subscriber.issubscribe !== true || subscriber.emailpermstatus !== true) {
      console.warn(`[PROMOTIONAL] Skipping promotional email for customer=${customerId || customerData.customerid || 'unknown'} because subscriber opt-out or permissions are disabled`);
      return {
        success: true,
        skipped: true,
        message: 'Email skipped due to subscriber opt-out or permission settings',
        data: null,
      };
    }

    if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
      console.warn(`[PROMOTIONAL] Skipping promotional email for customer=${customerId || customerData.customerid || 'unknown'} because no recipient email is available`);
      return {
        success: true,
        skipped: true,
        message: 'Email skipped: recipient email is missing or invalid',
        data: null,
      };
    }

    const emailHtml =
     emailType === 'promotional'
       ?
    generatePromotionalEmailHTML(customerData)
       :
    generateOnboardingHTML(customerData);

    const mailOptions = {
      from: EMAIL_USER_ID,
      to: recipientEmail,
      subject,
      html: emailHtml,
    };

    const result = await transporter.sendMail(mailOptions);

    if (
      !result ||
      !result.messageId ||
      !Array.isArray(result.accepted) ||
      result.accepted.length === 0
    ) {
      throw new Error(`Email transport reported failure: ${JSON.stringify(result)}`);
    }

    if (customerId) {
      try {
        await interactionModel.createInteraction({
          customerid: customerId,
          interactionmode: 'EMAIL',
          interactiontype: 'PROMOTIONAL',
          interactionvalue: campaignId
            ? interactionModel.getPromotionalCampaignValue(campaignId)
            : 'PROMOTIONAL_EMAIL',
        });
        console.info(`[PROMOTIONAL] Recorded interaction for customer=${customerId}`);
      } catch (interactionError) {
        console.error(`[PROMOTIONAL] Failed to record promotional interaction for customer=${customerId}: ${interactionError.message}`);
      }
    }

    console.info(`[PROMOTIONAL] Promotional email sent successfully for customer=${customerId || 'unknown'} messageId=${result.messageId || 'n/a'}`);
    return { success: true, message: 'Promotional email sent successfully', data: result };
  } catch (mailError) {
    console.error(`[PROMOTIONAL] Failed to send promotional email for customer=${customerId || 'unknown'} subject=${subject || 'PROMOTIONAL_EMAIL'}: ${mailError.message}`);

    if (shouldQueueOnFailure && !skipDlqRecord) {
      await createDlqEntry(
        campaignId ? { ...customerData, campaignId } : customerData,
        subject,
        mailError
      );
    }

    return { 
      success: false,
       message: mailError.message,
      statusCode: mailError.statusCode || 500,};
  }
};

const getFailedPromotionalEvents = async () => {
  try {
    return await prisma.promotionaldlq.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdat: 'asc' },
    });
  } catch (error) {
    console.error(`[PROMOTIONAL] Failed to retrieve failed promotional events: ${error.message}`);
    throw error;
  }
};

const retryFailedPromotionalEvents = async () => {
  try {
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

    console.info(`[PROMOTIONAL] Starting DLQ retry batch with ${pendingEvents.length} pending event(s)`);

    const results = [];

    for (const event of pendingEvents) {
      try {
        const payload = typeof event.payload === 'object' && event.payload !== null ? event.payload : {};
        console.info(`[PROMOTIONAL] Retrying DLQ event ${event.eventid} for customer=${payload.customerid || payload.customerId || 'unknown'}`);

         // ✅ AUDIT DLQ RETRY ATTEMPT (BEFORE)
        await auditService.createAuditEntry({
          entityType: "DLQ",
          entityId: event.eventid,
          action: "DLQ_RETRY_ATTEMPT",
          customerId: event.customerid,
          oldValue: {
            status: event.status,
            attemptcount: event.attemptcount,
          },
          metadata: {
            retryAttempt: event.attemptcount + 1,
            subject: event.subject,
            errorMessage: event.errormessage,
          },
        });


        const result = await sendPromotionalEmails(payload, event.subject, {
          shouldQueueOnFailure: false,
          skipDlqRecord: true,
          campaignId: payload.campaignId || payload.campaignid || null,
          emailType: 'promotional',
        });

        if (result.success && !result.skipped) {
         await prisma.promotionaldlq.update({
         where: { eventid: event.eventid },
        data: {
      status: 'SENT',
      updatedat: new Date(),
      lastattemptat: new Date(),
    },
  });
 // ✅ AUDIT DLQ SUCCESS
          await auditService.createAuditEntry({
            entityType: "DLQ",
            entityId: event.eventid,
            action: "DLQ_RETRY_SUCCESS",
            customerId: event.customerid,
            newValue: {
              status: 'SENT',
              attemptcount: event.attemptcount + 1,
            },
            metadata: {
              successfulAttempt: event.attemptcount + 1,
              subject: event.subject,
            },
          });

  console.info(`[PROMOTIONAL] DLQ event ${event.eventid} retried successfully`);
          results.push({ eventId: event.eventid, status: 'retried' });

        } else if (result.skipped) {
          await prisma.promotionaldlq.update({
            where: { eventid: event.eventid },
            data: {
              status: 'SKIPPED',
              updatedat: new Date(),
              lastattemptat: new Date(),
              nextretryat: null,

            },
          });
           // ✅ AUDIT DLQ SKIP
          await auditService.createAuditEntry({
            entityType: "DLQ",
            entityId: event.eventid,
            action: "DLQ_RETRY_SKIPPED",
            customerId: event.customerid,
            newValue: {
              status: 'SKIPPED',
            },
            metadata: {
              skipReason: result.message,
              subject: event.subject,
            },
          });

  results.push({
    eventId: event.eventid,
    status: 'skipped',
    message: result.message,
  });

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

            // ✅ AUDIT DLQ FAILURE
          await auditService.createAuditEntry({
            entityType: "DLQ",
            entityId: event.eventid,
            action: shouldMarkFailed ? "DLQ_RETRY_FAILED_FINAL" : "DLQ_RETRY_FAILED_TEMP",
            customerId: event.customerid,
            newValue: {
              status: shouldMarkFailed ? 'FAILED' : 'PENDING',
              attemptcount: nextAttemptCount,
            },
            metadata: {
              failedAttempt: nextAttemptCount,
              maxRetries: MAX_RETRY_ATTEMPTS,
              errorMessage: result.message,
              isFinal: shouldMarkFailed,
            },
          });

          console.warn(`[PROMOTIONAL] DLQ event ${event.eventid} remained pending after retry attempt ${nextAttemptCount}: ${result.message}`);
          results.push({
            eventId: event.eventid,
            status: shouldMarkFailed ? 'failed' : 'queued',
            message: result.message,
          });
        }
      } catch (retryError) {
        console.error(`[PROMOTIONAL_DLQ] Retry failed for ${event.eventid}: ${retryError.message}`);

        const nextAttemptCount = event.attemptcount + 1;
        const permanentlyFailed = nextAttemptCount >= MAX_RETRY_ATTEMPTS;

        await prisma.promotionaldlq.update({
          where: { eventid: event.eventid },
          data: {
            attemptcount: nextAttemptCount,
            errormessage: retryError.message,
            status: permanentlyFailed ? 'FAILED' : 'PENDING',
            updatedat: new Date(),
            lastattemptat: new Date(),
            nextretryat:
              permanentlyFailed
                ? null
                : new Date(Date.now() + RETRY_DELAY_MS),
          },
        });

         // ✅ AUDIT DLQ EXCEPTION
        await auditService.createAuditEntry({
          entityType: "DLQ",
          entityId: event.eventid,
          action: "DLQ_RETRY_ERROR",
          customerId: event.customerid,
          metadata: {
            exceptionMessage: retryError.message,
            stackTrace: retryError.stack,
          },
        });
      
          results.push({
          eventId: event.eventid,
          status: permanentlyFailed ? 'failed' : 'queued',
          message: retryError.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error(`[PROMOTIONAL] Failed to process DLQ retry batch: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendPromotionalEmails,
  getFailedPromotionalEvents,
  retryFailedPromotionalEvents,
};