const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { validateCustomerId } = require('../middleware/customerValidator');

// GET /api/v1/loyalty/:customerId
router.get('/:customerId', validateCustomerId, loyaltyController.getLoyaltySummary);

module.exports = router;