// controllers/promotionalMessageController.js
const { PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT } = require('../constants/constant');
const promotionalMessageService = require('../services/promotionalMessageService');
const { sendWeeklyPromotionalCampaign } = require('../services/promotionalCampaignService');

const createPromotionalMessage = async (req, res) => {
  const customerId = req.body?.customerid || req.body?.customerId || 'unknown';
  console.info(`[PROMOTIONAL_CONTROLLER] Received promotional send request for customer=${customerId}`);

  try {
    const data = req.body;

    const result =
      await promotionalMessageService.sendPromotionalEmails(
        data,
         PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT,
        {
          emailType: 'promotional',
          campaignId: data.campaignId || null,
        });

    if (!result || !result.success) {
      const statusCode = result?.statusCode || 500;
      const message = result?.message || 'Failed to send promotional email';
      
      console.warn(`[PROMOTIONAL_CONTROLLER] Promotional send did not complete for customer=${customerId}: ${result?.message || 'unknown error'}`);
      return res.status(statusCode).json({
        success: false,
        message,
      });
    }

    console.info(`[PROMOTIONAL_CONTROLLER] Promotional send completed successfully for customer=${customerId}`);
    return res.status(201).json({
      success: true,
      message: 'Promotional emails sent successfully',
      data: result.data,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    console.error(`[PROMOTIONAL_CONTROLLER] Promotional send failed for customer=${customerId}: ${error.message}`);
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

const getFailedPromotionalMessages = async (req, res) => {
  try {
    console.info('[PROMOTIONAL_CONTROLLER] Retrieving failed promotional events from DLQ');
    const failedEvents = await promotionalMessageService.getFailedPromotionalEvents();
    return res.status(200).json({
      success: true,
      data: failedEvents,
    });
  } catch (error) {
    console.error(`[PROMOTIONAL_CONTROLLER] Failed to retrieve failed promotional events: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const retryFailedPromotionalMessages = async (req, res) => {
  try {
    console.info('[PROMOTIONAL_CONTROLLER] Starting promotional DLQ retry process');
    const results = await promotionalMessageService.retryFailedPromotionalEvents({
      createdBy: req.user?.id || 'MANUAL_USER',
      createdByType: 'MANUAL',
    });

    console.info(`[PROMOTIONAL_CONTROLLER] DLQ retry process completed with ${results.length} event(s)`);
    return res.status(200).json({
      success: true,
      message: 'Retry process completed',
      data: results,
    });
  } catch (error) {
    console.error(`[PROMOTIONAL_CONTROLLER] DLQ retry process failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const sendPromotionalCampaign = async (req, res) => {
  try {
    const summary = await sendWeeklyPromotionalCampaign(req.body);
    return res.status(200).json({
      success: true,
      message: 'Promotional campaign processed successfully',
      data: summary,
    });
  } catch (error) {
    console.error(`[PROMOTIONAL_CONTROLLER] Campaign failed: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPromotionalMessage,
  sendPromotionalCampaign,
  getFailedPromotionalMessages,
  retryFailedPromotionalMessages,
};