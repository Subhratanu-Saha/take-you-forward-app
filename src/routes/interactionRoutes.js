const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

const {
  validateCreateInteraction,
  validateUpdateInteraction,
} = require('../middleware/interactionValidator');

// GET interaction by ID [/api/v1/interaction/:interactionId]
router.get('/:interactionId', interactionController.getInteractionRecord);

// CREATE new interaction [/api/v1/interaction]
router.post('/', validateCreateInteraction, interactionController.createInteractionRecord);

// UPDATE interaction [/api/v1/interaction/:interactionId]
router.put('/:interactionId', validateUpdateInteraction, interactionController.updateInteractionRecord);

module.exports = router;