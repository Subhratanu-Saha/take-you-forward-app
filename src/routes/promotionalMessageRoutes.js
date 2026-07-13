const express = require('express');
const promotionalMessageController = require('../controllers/promotionalMessageController');
const { validateCreatePromotionalMessage } = require('../middleware/promotionalMessageValidator');

const router = express.Router();

router.get('/dlq', promotionalMessageController.getFailedPromotionalMessages);
router.post('/retry', promotionalMessageController.retryFailedPromotionalMessages);
router.post('/', validateCreatePromotionalMessage, promotionalMessageController.createPromotionalMessage);

module.exports = router;