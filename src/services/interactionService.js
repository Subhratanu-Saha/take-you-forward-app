const interactionModel = require('../models/interaction');

// ==================== GET ALL INTERACTIONS ====================
const getAllInteractions = async () => {
  try {
    const interactions = await interactionModel.getAllInteractions();
    console.log(`[INTERACTION_SERVICE] Retrieved ${interactions?.length || 0} interaction records`);
    return interactions;
  } catch (error) {
    console.error('[INTERACTION_SERVICE] Failed to retrieve all interaction records', error);
    throw error;
  }
};

// ==================== GET INTERACTION BY ID ====================
const getInteractionRecord = async (interactionid) => {
  const normalizedId = interactionid?.trim();
  console.log(`[INTERACTION_SERVICE] Fetching interaction record for interactionId=${normalizedId || 'unknown'}`);

  if (!normalizedId) {
    console.warn('[INTERACTION_SERVICE] Interaction ID is missing');
    throw new Error('Interaction ID is required');
  }

  try {
    const interaction = await interactionModel.getInteractionById(normalizedId);
    if (!interaction) {
      console.warn(`[INTERACTION_SERVICE] Interaction not found for interactionId=${normalizedId}`);
      throw new Error('Interaction not found');
    }

    console.log(`[INTERACTION_SERVICE] Interaction record fetched successfully for interactionId=${normalizedId}`);
    return interaction;
  } catch (error) {
    console.error(`[INTERACTION_SERVICE] Failed to fetch interaction record for interactionId=${normalizedId}`, error);
    throw error;
  }
};

// ==================== GET INTERACTIONS BY SUBSCRIBER ID ====================
const getInteractionsBySubscriberId = async (subscriberid) => {
  const normalizedSubscriberId = subscriberid?.trim();
  console.log(`[INTERACTION_SERVICE] Fetching interactions for subscriberId=${normalizedSubscriberId || 'unknown'}`);

  if (!normalizedSubscriberId) {
    console.warn('[INTERACTION_SERVICE] Subscriber ID is missing');
    throw new Error('Subscriber ID is required');
  }

  try {
    const interactions = await interactionModel.getInteractionsBySubscriberId(normalizedSubscriberId);
    if (!interactions || interactions.length === 0) {
      console.warn(`[INTERACTION_SERVICE] No interactions found for subscriberId=${normalizedSubscriberId}`);
      throw new Error('No interactions found for the given subscriber ID');
    }

    console.log(`[INTERACTION_SERVICE] Retrieved ${interactions.length} interactions for subscriberId=${normalizedSubscriberId}`);
    return interactions;
  } catch (error) {
    console.error(`[INTERACTION_SERVICE] Failed to fetch interactions for subscriberId=${normalizedSubscriberId}`, error);
    throw error;
  }
};

// ==================== CREATE INTERACTION ====================
const createInteraction = async (interactionData) => {
  console.log('[INTERACTION_SERVICE] Attempting to create interaction record', {
    customerId: interactionData?.customerid,
    interactionType: interactionData?.interactiontype,
  });

  if (!interactionData || typeof interactionData !== 'object') {
    console.warn('[INTERACTION_SERVICE] Interaction payload is missing or invalid');
    throw new Error('Interaction payload must be a non-empty object');
  }

  try {
    const interaction = await interactionModel.createInteraction(interactionData);
    console.log('[INTERACTION_SERVICE] Interaction record created successfully', {
      interactionId: interaction?.interactionid,
      customerId: interaction?.customerid,
    });
    return interaction;
  } catch (error) {
    console.error('[INTERACTION_SERVICE] Failed to create interaction record', error);
    throw error;
  }
};

// ==================== UPDATE INTERACTION ====================
const updateInteractionRecord = async (interactionid, interactionData) => {
  const normalizedId = interactionid?.trim();
  console.log(`[INTERACTION_SERVICE] Updating interaction record for interactionId=${normalizedId || 'unknown'}`, {
    updatePayload: interactionData,
  });

  if (!normalizedId) {
    console.warn('[INTERACTION_SERVICE] Interaction ID is missing for update');
    throw new Error('Interaction ID is required');
  }

  try {
    const existingInteraction = await interactionModel.getInteractionById(normalizedId);
    if (!existingInteraction) {
      console.warn(`[INTERACTION_SERVICE] Interaction not found for update interactionId=${normalizedId}`);
      throw new Error('Interaction not found');
    }

    const interaction = await interactionModel.updateInteraction(normalizedId, interactionData);
    console.log(`[INTERACTION_SERVICE] Interaction record updated successfully for interactionId=${normalizedId}`);
    return interaction;
  } catch (error) {
    console.error(`[INTERACTION_SERVICE] Failed to update interaction record for interactionId=${normalizedId}`, error);
    throw error;
  }
};

const deleteInteractionRecord = async (interactionid) => {
  const normalizedId = interactionid?.trim();

  if (!normalizedId) {
    throw new Error('Interaction ID is required');
  }

  const existingInteraction = await interactionModel.getInteractionById(normalizedId);
  if (!existingInteraction) {
    throw new Error('Interaction not found');
  }

  return interactionModel.deleteInteraction(normalizedId);
};

module.exports = {
  getAllInteractions,
  getInteractionRecord,
  getInteractionsBySubscriberId,
  createInteraction,
  updateInteractionRecord,
  deleteInteractionRecord,
};
