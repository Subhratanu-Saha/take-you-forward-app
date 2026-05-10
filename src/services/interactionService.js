const interactionModel = require('../models/interactionModel');

// ==================== GET ALL INTERACTIONS ====================
const getAllInteractions = async () => {
  return await interactionModel.getAllInteractions();
};
// ==================== GET INTERACTION BY ID ====================
const getInteractionById = async (interactionid) => {

  const interactions = await interactionModel.getInteractionById(interactionid);
  if (!interactions) {
    throw new Error('Interaction not found');
  }
  return interactions;
};
// ==================== GET INTERACTIONS BY SUBSCRIBER ID ====================
const getInteractionsBySubscriberId = async (subscriberid) => {

  const interactions = await interactionModel.getInteractionsBySubscriberId(subscriberid);
  if (!interactions) {
    throw new Error('No interactions found for the given subscriber ID');
  }
  return interactions;
};
// ==================== CREATE INTERACTION ====================
const createInteraction = async (interactionData) => {
  return await interactionModel.createInteraction(interactionData);
};
// ==================== UPDATE INTERACTION ====================
const updateInteraction = async (interactionid, interactionData) => {   
  const interactions = await interactionModel.getInteractionById(interactionid);
  if (!interactions) {
    throw new Error('Interaction not found');
  }
  return await interactionModel.updateInteraction(interactionid, interactionData);
};
module.exports = {
  getAllInteractions,
  getInteractionById,
  getInteractionsBySubscriberId,
  createInteraction,
  updateInteraction
};
