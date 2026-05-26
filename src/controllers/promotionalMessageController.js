// controllers/promotionalMessageController.js
const promotionalMessageService = require('../services/promotionalMessageService');

const createPromotionalMessage = async (req, res) => {
  try {
    const data = req.body;

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