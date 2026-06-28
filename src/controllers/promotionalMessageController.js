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

    res.status(201).json({
      success: true,
      message: 'Promotional emails sent successfully',
      data: result.data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

module.exports = {
  createPromotionalMessage
};