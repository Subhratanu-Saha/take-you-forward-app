const subscriberModel = require('../models/subscriber');

// ==================== GET ALL SUBSCRIBERS ====================
const getAllSubscribers = async () => {
  return await subscriberModel.getAllSubscribers();
};

// ==================== GET SUBSCRIBER BY ID ====================
const getSubscriberById = async (subscriberid) => {
  if (!subscriberid?.trim()) {
    throw new Error('Subscriber ID is required');
  }

  const subscriber = await subscriberModel.getSubscriberById(subscriberid);
  if (!subscriber) {
    throw new Error('Subscriber not found');
  }

  return subscriber;
};

// ==================== GET SUBSCRIBER BY CUSTOMER ID ====================
const getSubscriberByCustomerId = async (customerid) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }

  const subscriber = await subscriberModel.getSubscriberByCustomerId(customerid);
  if (!subscriber) {
    throw new Error('Subscriber not found for this customer');
  }

  return subscriber;
};

// ==================== CREATE SUBSCRIBER ====================
const createSubscriber = async (subscriberData) => {
  // Validate required fields
  if (!subscriberData.customerid?.trim()) {
    throw new Error('Customer ID is required');
  }

  if (typeof subscriberData.issubscribe !== 'boolean') {
    throw new Error('isSubscribe must be a boolean');
  }

  if (typeof subscriberData.emailpermstatus !== 'boolean') {
    throw new Error('emailPermStatus must be a boolean');
  }

  if (typeof subscriberData.smspermstatus !== 'boolean') {
    throw new Error('smsPermStatus must be a boolean');
  }

  // Check if subscriber already exists for this customer or not
  const existing = await subscriberModel.getSubscriberByCustomerId(subscriberData.customerid);
  if (existing) {
    throw new Error('Subscriber already exists for this customer');
  }

  return await subscriberModel.createSubscriber(subscriberData);
};

// ==================== UPDATE SUBSCRIBER ====================
const updateSubscriber = async (subscriberid, subscriberData) => {
  if (!subscriberid?.trim()) {
    throw new Error('Subscriber ID is required');
  }

  const subscriber = await subscriberModel.getSubscriberById(subscriberid);
  if (!subscriber) {
    throw new Error('Subscriber not found');
  }

  // Validate fields if provided
  if (subscriberData.issubscribe !== undefined && typeof subscriberData.issubscribe !== 'boolean') {
    throw new Error('isSubscribe must be a boolean');
  }

  if (subscriberData.emailpermstatus !== undefined && typeof subscriberData.emailpermstatus !== 'boolean') {
    throw new Error('emailPermStatus must be a boolean');
  }

  if (subscriberData.smspermstatus !== undefined && typeof subscriberData.smspermstatus !== 'boolean') {
    throw new Error('smsPermStatus must be a boolean');
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