const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');
const { validateCreateSubscriber } = require('../middleware/subscriberValidator');

// GET subscriber by customer ID [/api/v1/subscriber?customerid=X]
router.get('/', subscriberController.getSubscriberRecord);

// CREATE new subscriber [/api/v1/subscriber]
router.post('/', validateCreateSubscriber, subscriberController.createSubscriberRecord);

// UPDATE subscriber [/api/v1/subscriber]
router.put('/:subscriberId', subscriberController.updateSubscriberRecord);  

module.exports = router;