const interactionService = require('../services/interactionService');

const getInteractionRecord = async (req, res, next) => {
  const interactionId = req?.params?.interactionId;
  console.log(`[INTERACTION_CONTROLLER] GET interaction request received for interactionId=${interactionId || 'unknown'}`);

  try {
    const interaction = await interactionService.getInteractionRecord(interactionId);
    console.log(`[INTERACTION_CONTROLLER] Interaction record fetched successfully for interactionId=${interactionId}`);

    return res.status(200).json({
      success: true,
      message: 'Interaction record fetched successfully',
      data: interaction,
    });
  } catch (error) {
    console.error(`[INTERACTION_CONTROLLER] Failed to fetch interaction record for interactionId=${interactionId}`, error);

    if (error.statusCode === 404 || error.message?.includes('not found') || error.isOperational) {
      return res.status(error.statusCode || 404).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

const createInteractionRecord = async (req, res, next) => {
  console.log('[INTERACTION_CONTROLLER] POST interaction request received', {
    customerId: req?.body?.customerid,
    interactionType: req?.body?.interactiontype,
  });

  try {
    const interaction = await interactionService.createInteraction(req.body);
    console.log('[INTERACTION_CONTROLLER] Interaction record created successfully', {
      interactionId: interaction?.interactionid,
      customerId: interaction?.customerid,
    });

    return res.status(201).json({
      success: true,
      message: 'Interaction record created successfully',
      data: interaction,
    });
  } catch (error) {
    console.error('[INTERACTION_CONTROLLER] Failed to create interaction record', error);

    if (error.statusCode === 400 || error.isOperational) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

const updateInteractionRecord = async (req, res, next) => {
  const interactionId = req?.params?.interactionId;
  console.log(`[INTERACTION_CONTROLLER] PUT interaction request received for interactionId=${interactionId || 'unknown'}`, {
    updatePayload: req?.body,
  });

  try {
    const interaction = await interactionService.updateInteractionRecord(
      interactionId,
      req.body
    );
    console.log(`[INTERACTION_CONTROLLER] Interaction record updated successfully for interactionId=${interactionId}`);

    return res.status(200).json({
      success: true,
      message: 'Interaction record updated successfully',
      data: interaction,
    });
  } catch (error) {
    console.error(`[INTERACTION_CONTROLLER] Failed to update interaction record for interactionId=${interactionId}`, error);

    if (error.statusCode === 400 || error.isOperational) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

module.exports = {
  getInteractionRecord,
  createInteractionRecord,
  updateInteractionRecord,
};
