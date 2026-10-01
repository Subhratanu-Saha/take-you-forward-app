const subscriberService = require('../services/subscriberService');

// GET subscriber record by ID
const getSubscriberRecord = async (req, res, next) => {
  const subscriberId = req.params.subscriberId || req.params.subscriberid;
  console.log(`Received request to fetch subscriber with ID: ${subscriberId}`);
  try {
    const subscriber = await subscriberService.getSubscriberById(subscriberId);
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    return res.status(200).json({
      success: true,
      message: 'Subscriber record fetched successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error(`Error fetching subscriber with ID ${subscriberId}:`, error.message);
    if (error.statusCode === 404 || error.message?.includes('not found') || error.isOperational) {
      return res.status(error.statusCode || 404).json({
        success: false,
        message: error.message || 'Subscriber record not found',
      });
    }
    return next(error);
  }
};

// GET subscriberID by customerID
const getSubscriberByCustomerId = async (req, res, next) => {
  const customerId = req.params.customerId || req.query.customerId || req.query.customerid;
  console.log(`Received request to fetch subscriber for customer ID: ${customerId}`);
  try {
    const subscriber = await subscriberService.getSubscriberByCustomerId(customerId);
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    return res.status(200).json({
      success: true,
      message: 'Subscriber record fetched successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error(`Error fetching subscriber for customer ID ${customerId}:`, error.message);
    if (error.statusCode === 404 || error.message?.includes('not found') || error.isOperational) {
      return res.status(error.statusCode || 404).json({
        success: false,
        message: error.message || 'Subscriber record not found',
      });
    }
    return next(error);
  }
};

// CREATE new subscriber record
const createSubscriberRecord = async (req, res, next) => {
  console.log('Received request to create new subscriber:', req.body);
  try {
    const subscriber = await subscriberService.createSubscriber(req.body);
    console.log('Successfully created subscriber:', subscriber);
    return res.status(201).json({
      success: true,
      message: 'Subscriber record created successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error('Error creating subscriber:', error.message);
    if (error.statusCode === 400 || error.isOperational) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
};

// UPDATE subscriber record
const updateSubscriberRecord = async (req, res, next) => {
  const subscriberId = req.params.subscriberId || req.params.subscriberid;
  console.log(`Received request to update subscriber with ID: ${subscriberId}`);
  try {
    const subscriber = await subscriberService.updateSubscriber(subscriberId, req.body);
    console.log(`Successfully updated subscriber: ${subscriber.name}`);
    return res.status(200).json({
      success: true,
      message: 'Subscriber record updated successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error(`Error updating subscriber with ID ${subscriberId}:`, error.message);
    if (error.statusCode === 400 || error.isOperational) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
};

module.exports = {
  getSubscriberRecord,
  getSubscriberByCustomerId,
  createSubscriberRecord,
  updateSubscriberRecord,
};