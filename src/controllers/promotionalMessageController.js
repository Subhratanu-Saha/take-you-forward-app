// controllers/promotionalMessageController.js

const promotionalMessageService = require('../services/promotionalMessageService');

const createPromotionalMessage = async (req, res) => {

  try {

    const data = req.body;

    // 400 Validation Error
    if (!data.title || !data.message) {

      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });

    }

    const result =
      await promotionalMessageService.createPromotionalMessage(data);

    res.status(201).json({
      success: true,
      message: 'Promotional message created successfully',
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