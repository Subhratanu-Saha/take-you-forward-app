const subscriberModel = require('../models/subscriber');

// ==================== GET ALL SUBSCRIBERS ====================
const getAllSubscribers = async () => {
  console.log('Fetching all subscribers...');
  try {
    const subscribers = await subscriberModel.getAllSubscribers();
    console.log(`Successfully fetched ${subscribers.length} subscribers.`);
    return subscribers;
  } catch (error) {
    console.error('Error fetching subscribers:', error.message);
    throw error;
  }
};

// ==================== GET SUBSCRIBER BY ID ====================
const getSubscriberById = async (subscriberid) => {
  console.log(`Fetching subscriber with ID: ${subscriberid}`);
  try {
    const subscriber = await subscriberModel.getSubscriberById(subscriberid);
    if (!subscriber) {
      throw new Error('Subscriber not found');
    }
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    return subscriber;
  } catch (error) {
    console.error('Error fetching subscriber:', error.message);
    throw error;
  }

  return subscriber;
};

// ==================== GET SUBSCRIBER BY CUSTOMER ID ====================
const getSubscriberByCustomerId = async (customerid) => {

  console.log(`Fetching subscriber for customer ID: ${customerid}`);
  try {
    const subscriber = await subscriberModel.getSubscriberByCustomerId(customerid);
    if (!subscriber) {
      console.warn(`Subscriber not found for customer ID: ${customerid}`);
      throw new Error('Subscriber not found for this customer');
    }
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    return subscriber;
  } catch (error) {
    console.error('Error fetching subscriber by customer ID:', error.message);
    console.error(error.stack);
    throw error;
  }
};
//   const subscriber = await subscriberModel.getSubscriberByCustomerId(customerid);
//   if (!subscriber) {
//     throw new Error('Subscriber not found for this customer');
//   }

//   return subscriber;
// };

// ==================== CREATE SUBSCRIBER ====================
const createSubscriber = async (subscriberData) => {

console.log('Creating new subscriber with data:', subscriberData);

try {
  const newSubscriber = await subscriberModel.createSubscriber(subscriberData);
  console.log('Successfully created subscriber:', newSubscriber);
  return newSubscriber;
} catch (error) {
  console.error('Error creating subscriber:', error.message);
  throw error;
}
};

// ==================== UPDATE SUBSCRIBER ====================
const updateSubscriber = async (subscriberid, subscriberData) => {
  
console.log(`Updating subscriber with ID: ${subscriberid} and Update data:`, subscriberData);
try {
  const updatedSubscriber = await subscriberModel.updateSubscriber(subscriberid, subscriberData);
  if (!updatedSubscriber) {
    throw new Error('Subscriber not found for update');
  }
  console.log('Successfully updated subscriber:', updatedSubscriber);
  return updatedSubscriber;
} catch (error) {
  console.error('Error updating subscriber:', error.message);
  throw error;
}};

module.exports = {
  getAllSubscribers,
  getSubscriberById,
  getSubscriberByCustomerId,
  createSubscriber,
  updateSubscriber,
};