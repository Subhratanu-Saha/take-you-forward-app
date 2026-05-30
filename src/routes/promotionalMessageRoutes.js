const express = require('express');
const promotionalMessageController = require('../controllers/promotionalMessageController');    

const router = express.Router();

// POST /api/v1/promotionalMessage
router.post('/', promotionalMessageController.createPromotionalMessage);

module.exports = router;

