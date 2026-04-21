const subscriberModel = require('../models/subscriber');

// ==================== GET ALL SUBSCRIBERS ====================
const getAllSubscribers = async () => {
  return await subscriberModel.getAllSubscribers();
};

// ==================== GET SUBSCRIBER BY ID ====================
const getSubscriberById = async (subscriberid) => {

  const subscriber = await subscriberModel.getSubscriberById(subscriberid);
  if (!subscriber) {
    throw new Error('Subscriber not found');
  }

  return subscriber;
};

// ==================== GET SUBSCRIBER BY CUSTOMER ID ====================
const getSubscriberByCustomerId = async (customerid) => {

  const subscriber = await subscriberModel.getSubscriberByCustomerId(customerid);
  if (!subscriber) {
    throw new Error('Subscriber not found for this customer');
  }

  return subscriber;
};

// ==================== CREATE SUBSCRIBER ====================
const createSubscriber = async (subscriberData) => {

  // Check if subscriber already exists for this customer or not
  const existing = await subscriberModel.getSubscriberByCustomerId(subscriberData.customerid);
  if (existing) {
    throw new Error('Subscriber already exists for this customer');
  }

  return await subscriberModel.createSubscriber(subscriberData);
};

// ==================== UPDATE SUBSCRIBER ====================
const updateSubscriber = async (subscriberid, subscriberData) => {
  
  const subscriber = await subscriberModel.getSubscriberById(subscriberid);
  if (!subscriber) {
    throw new Error('Subscriber not found');
  }

  return await subscriberModel.updateSubscriber(subscriberid, subscriberData);
};

module.exports = {
  getAllSubscribers,
  getSubscriberById,
  getSubscriberByCustomerId,
  createSubscriber,
  updateSubscriber,
};