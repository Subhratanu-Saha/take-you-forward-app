const interactionService = require('../services/interactionService');

const getInteractionRecord = async (req, res) => {
  const interactionId = req?.params?.interactionId;
  console.log(`[INTERACTION_CONTROLLER] GET interaction request received for interactionId=${interactionId || 'unknown'}`);

  try {
    const interaction = await interactionService.getInteractionRecord(interactionId);
    console.log(`[INTERACTION_CONTROLLER] Interaction record fetched successfully for interactionId=${interactionId}`);

    res.status(200).json({
      success: true,
      message: 'Interaction record fetched successfully',
      data: interaction,
    });
  } catch (error) {
    console.error(`[INTERACTION_CONTROLLER] Failed to fetch interaction record for interactionId=${interactionId}`, error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const createInteractionRecord = async (req, res) => {
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

    res.status(201).json({
      success: true,
      message: 'Interaction record created successfully',
      data: interaction,
    });
  } catch (error) {
    console.error('[INTERACTION_CONTROLLER] Failed to create interaction record', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateInteractionRecord = async (req, res) => {
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

    res.status(200).json({
      success: true,
      message: 'Interaction record updated successfully',
      data: interaction,
    });
  } catch (error) {
    console.error(`[INTERACTION_CONTROLLER] Failed to update interaction record for interactionId=${interactionId}`, error);

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
