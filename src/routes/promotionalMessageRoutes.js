const express = require('express');
const promotionalMessageController = require('../controllers/promotionalMessageController');
const { validateCreatePromotionalMessage } = require('../middleware/promotionalMessageValidator');

const router = express.Router();

// POST /api/v1/promotionalMessage
router.post('/', validateCreatePromotionalMessage, promotionalMessageController.createPromotionalMessage);

module.exports = router;

