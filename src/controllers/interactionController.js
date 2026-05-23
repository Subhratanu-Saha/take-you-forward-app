const interactionService = require('../services/interactionService');

const getInteractionRecord = async (req, res) => {
  try {
    const interaction = await interactionService.getInteractionRecord(req.params.interactionId);
    res.status(200).json({
      success: true,
      message: 'Interaction record fetched successfully',
      data: interaction,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const createInteractionRecord = async (req, res) => {
  try {
    
    const interaction = await interactionService.createInteraction(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Interaction record created successfully',
      data: interaction,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateInteractionRecord = async (req, res) => {
  try {
    const interaction = await interactionService.updateInteractionRecord(
      req.params.interactionId,
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Interaction record updated successfully',
      data: interaction,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getInteractionRecord,
  createInteractionRecord,
  updateInteractionRecord,
};
