const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');

// GET subscriber (Expects ?customerid= query param)
router.get('/', subscriberController.getSubscriberRecord);

// CREATE new subscriber
router.post('/', subscriberController.createSubscriberRecord);

// UPDATE subscriber
router.put('/', subscriberController.updateSubscriberRecord);

module.exports = router;