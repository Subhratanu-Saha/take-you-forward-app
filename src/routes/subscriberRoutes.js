const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');
const {
  validateCreateSubscriber,
  validateUpdateSubscriber,
  validateGetSubscriberById,
  validateGetSubscriberByCustomerId,
} = require('../middleware/subscriberValidator');

// GET subscriber by customer ID [/api/v1/subscriber?customerid=X]
router.get('/', validateGetSubscriberByCustomerId, subscriberController.getSubscriberByCustomerId);

// GET subscriber by ID [/api/v1/subscriber/:subscriberId]
router.get('/:subscriberId', validateGetSubscriberById, subscriberController.getSubscriberRecord);

// CREATE new subscriber [/api/v1/subscriber]
router.post('/', validateCreateSubscriber, subscriberController.createSubscriberRecord);

// UPDATE subscriber [/api/v1/subscriber/:subscriberId]
router.put('/:subscriberId', validateUpdateSubscriber, subscriberController.updateSubscriberRecord);

// DELETE subscriber
router.delete('/:subscriberId', subscriberController.deleteSubscriberRecord);

module.exports = router;