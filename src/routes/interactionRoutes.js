const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

const {
  validateCreateInteraction,
  validateUpdateInteraction,
  validateDeleteInteraction,
  validateInteractionId,
  validateGetAllInteractions,
} = require('../middleware/interactionValidator');

// GET all interactions [/api/v1/interactions]
router.get(
  '/',
  validateGetAllInteractions,
  interactionController.getAllInteractions
);

// SEARCH interactions [/api/v1/interactions/search/:term]
router.get(
  '/search/:term',
  interactionController.searchInteractions
);

// GET interaction by ID [/api/v1/interactions/:interactionId]
router.get(
  '/:interactionId',
  validateInteractionId,
  interactionController.getInteractionById
);

// CREATE new interaction [/api/v1/interactions]
router.post(
  '/',
  validateCreateInteraction,
  interactionController.createInteraction
);

// UPDATE interaction [/api/v1/interactions/:interactionId]
router.put(
  '/:interactionId',
  validateUpdateInteraction,
  interactionController.updateInteraction
);

// DELETE interaction [/api/v1/interactions/:interactionId]
router.delete(
  '/:interactionId',
  validateDeleteInteraction,
  interactionController.deleteInteraction
);

module.exports = router;