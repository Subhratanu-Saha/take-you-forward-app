// controllers/promotionalMessageController.js
const { PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT } = require('../constants/constant');
const promotionalMessageService = require('../services/promotionalMessageService');

const createPromotionalMessage = async (req, res) => {

  try {

    const data = req.body;

    const result =
      await promotionalMessageService.sendPromotionalEmails(data, PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT);

    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        message: result ? result.message : 'Failed to send promotional email'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Promotional emails sent successfully',
      data: result.data
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

const getFailedPromotionalMessages = async (req, res) => {
  try {
    const failedEvents = await promotionalMessageService.getFailedPromotionalEvents();
    return res.status(200).json({
      success: true,
      data: failedEvents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const retryFailedPromotionalMessages = async (req, res) => {
  try {
    const results = await promotionalMessageService.retryFailedPromotionalEvents();

    return res.status(200).json({
      success: true,
      message: 'Retry process completed',
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPromotionalMessage,
  getFailedPromotionalMessages,
  retryFailedPromotionalMessages,
};