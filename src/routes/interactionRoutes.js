const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

const {
  validateCreateInteraction,
  validateUpdateInteraction,
  validateDeleteInteraction,
} = require('../middleware/interactionValidator');

// GET interaction by ID [/api/v1/interaction/:interactionId]
router.get('/:interactionId', interactionController.getInteractionById);

// CREATE new interaction [/api/v1/interaction]
router.post('/', validateCreateInteraction, interactionController.createInteraction);

// UPDATE interaction [/api/v1/interaction/:interactionId]
router.put('/:interactionId', validateUpdateInteraction, interactionController.updateInteraction);

// DELETE interaction [/api/v1/interaction/:interactionId]
router.delete('/:interactionId', validateDeleteInteraction, interactionController.deleteInteraction);

module.exports = router;