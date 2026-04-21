const subscriberService = require('../services/subscriberService');

// GET subscriber record by ID
const getSubscriberRecord = async (req, res) => {
  try {
    const subscriber = await subscriberService.getSubscriberById(req.params.subscriberId);
    res.status(200).json({
      success: true,
      message: 'Subscriber record fetched successfully',
      data: subscriber,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Subscriber record not found',
    });
  }
};

// CREATE new subscriber record
const createSubscriberRecord = async (req, res) => {
  try {
    const subscriber = await subscriberService.createSubscriber(req.body);
    res.status(201).json({
      success: true,
      message: 'Subscriber record created successfully',
      data: subscriber,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE subscriber record
const updateSubscriberRecord = async (req, res) => {
  try {
    const subscriber = await subscriberService.updateSubscriber(req.params.subscriberId, req.body);
    res.status(200).json({
      success: true,
      message: 'Subscriber record updated successfully',
      data: subscriber,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSubscriberRecord,
  createSubscriberRecord,
  updateSubscriberRecord,
};