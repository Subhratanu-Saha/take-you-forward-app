const subscriberService = require('../services/subscriberService');

// GET subscriber record by ID
const getSubscriberRecord = async (req, res) => {
  const subscriberId = req.params.subscriberId || req.params.subscriberid;
  console.log(`Received request to fetch subscriber with ID: ${subscriberId}`);
  try {
    const subscriber = await subscriberService.getSubscriberById(subscriberId);
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    res.status(200).json({
      success: true,
      message: 'Subscriber record fetched successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error(`Error fetching subscriber with ID ${subscriberId}:`, error.message);
    res.status(404).json({
      success: false,
      message: 'Subscriber record not found',
    });
  }
};

//GET subscriberID by customerID
const getSubscriberByCustomerId = async (req, res) => {
  const customerId = req.params.customerId || req.query.customerId || req.query.customerid;
  console.log(`Received request to fetch subscriber for customer ID: ${customerId}`);
  try {
    const subscriber = await subscriberService.getSubscriberByCustomerId(customerId);
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    res.status(200).json({
      success: true,
      message: 'Subscriber record fetched successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error(`Error fetching subscriber for customer ID ${customerId}:`, error.message);
    res.status(404).json({
      success: false,
      message: 'Subscriber record not found',
    });
  }
};

// CREATE new subscriber record
const createSubscriberRecord = async (req, res) => {
  console.log('Received request to create new subscriber:', req.body);
  try {
    const subscriber = await subscriberService.createSubscriber(req.body);
    console.log('Successfully created subscriber:', subscriber);
    res.status(201).json({
      success: true,
      message: 'Subscriber record created successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error('Error creating subscriber:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE subscriber record
const updateSubscriberRecord = async (req, res) => {
  const subscriberId = req.params.subscriberId || req.params.subscriberid;
  console.log(`Received request to update subscriber with ID: ${subscriberId}`);
  try {
    const subscriber = await subscriberService.updateSubscriber(subscriberId, req.body);
    console.log(`Successfully updated subscriber: ${subscriber.name}`);
    res.status(200).json({
      success: true,
      message: 'Subscriber record updated successfully',
      data: subscriber,
    });
  } catch (error) {
    console.error(`Error updating subscriber with ID ${subscriberId}:`, error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSubscriberRecord = async (req, res) => {
  const subscriberId = req.params.subscriberId || req.params.subscriberid;

  try {
    await subscriberService.deleteSubscriber(subscriberId);
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSubscriberRecord,
  getSubscriberByCustomerId,
  createSubscriberRecord,
  updateSubscriberRecord,
  deleteSubscriberRecord,
};