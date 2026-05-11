const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

const {
  validateCreateInteraction,
  validateInteractionId
} = require('../middleware/interactionValidator');

// GET all interactions
router.get('/', interactionController.getAllInteractions);

// SEARCH interactions
router.get(
  '/search/:term',
  interactionController.searchInteractions
);

// GET interaction by ID
router.get(
  '/:interactionId',
  validateInteractionId,
  interactionController.getInteractionById
);

// CREATE interaction
router.post(
  '/',
  validateCreateInteraction,
  interactionController.createInteraction
);

// UPDATE interaction
router.put(
  '/:interactionId',
  validateInteractionId,
  interactionController.updateInteraction
);

// DELETE interaction
router.delete(
  '/:interactionId',
  validateInteractionId,
  interactionController.deleteInteraction
);

module.exports = router;