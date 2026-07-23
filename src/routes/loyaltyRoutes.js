const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { validateCustomerId } = require('../middleware/customerValidator');

// GET /api/v1/loyalty/:customerId
router.get('/:customerId', validateCustomerId, loyaltyController.getLoyaltySummary);

// CREATE initial loyalty record or ensure loyalty exists [/api/v1/loyalty/:customerId]
router.post('/:customerId', validateCustomerId, loyaltyController.createLoyaltyRecord);

// UPDATE loyalty tier [/api/v1/loyalty/:customerId]
router.put('/:customerId', validateCustomerId, loyaltyController.updateLoyaltyTier);

module.exports = router;