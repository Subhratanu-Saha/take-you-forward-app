// controllers/promotionalMessageController.js
const { PROMOTIONAL_ONBORDING_EMAIL_SUBJECT } = require('../constants/constant');
const promotionalMessageService = require('../services/promotionalMessageService');

const createPromotionalMessage = async (req, res) => {

  try {

    const data = req.body;

    // 400 Validation Error
    // if (!data.title || !data.message) {

    //   return res.status(400).json({
    //     success: false,
    //     message: 'Title and message are required'
    //   });

    // }

    const result =
      await promotionalMessageService.sendPromotionalEmails(data, PROMOTIONAL_ONBORDING_EMAIL_SUBJECT);

    res.status(201).json({
      success: true,
      message: 'Promotional emails sent successfully',
      data: result
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