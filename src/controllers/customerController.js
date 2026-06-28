const customerService = require('../services/customerService');
const config = require('../config');
const { INTERACTION_MODE, INTERACTION_TYPE, INTERACTION_VALUE } = require('../constants/constant');
const welcomeEmailService = require('../services/welcomeEmailService');

// GET all customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.customerId);
    res.status(200).json({
      success: true,
      message: 'Customer fetched successfully',
      data: customer,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE new customer
const createCustomer = async (req, res) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    if(customer){
      // Trigger downstream events concurrently (non-blocking)
      // Using Promise.allSettled to handle failures gracefully
      const eventTriggers = [
        // Subscriber event trigger
        (async () => {
          try {
            const issubscribe = true;
            const emailpermstatus = true;
            const smspermstatus = true;
            const response = await fetch(`${config.apiBaseUrl}/api/v1/subscriber`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                customerid: customer.customerid,
                issubscribe,
                emailpermstatus,
                smspermstatus,
              })
            });
            if (!response.ok) {
              throw new Error(`Subscriber service error: ${response.status}`);
            }
            return { success: true, service: 'subscriber' };
          } catch (error) {
            console.error('Subscriber event trigger failed:', error.message);
            return { success: false, service: 'subscriber', error: error.message };
          }
        })(),

        // Interaction event trigger
        (async () => {
          try {
            const response = await fetch(`${config.apiBaseUrl}/api/v1/interactions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                customerid: customer.customerid,
                interactionmode: INTERACTION_MODE.SIGNUP,
                interactiontype: INTERACTION_TYPE.SYSTEM,
                interactionvalue: INTERACTION_VALUE.ACCOUNT_CREATION,
              })
            });
            if (!response.ok) {
              throw new Error(`Interaction service error: ${response.status}`);
            }
            return { success: true, service: 'interaction' };
          } catch (error) {
            console.error('Interaction event trigger failed:', error.message);
            return { success: false, service: 'interaction', error: error.message };
          }
        })(),

        // Promotional welcome email trigger (direct service call)
        (async () => {
          try {
            const result = await welcomeEmailService.sendWelcomeEmail(customer);
            if (result.success) {
              return { success: true, service: 'promotional' };
            }
            throw new Error(result.message || 'Welcome email failed');
          } catch (error) {
            console.error('Promotional event trigger failed:', error.message);
            return { success: false, service: 'promotional', error: error.message };
          }
        })(),
      ];

      // Execute all event triggers concurrently (non-blocking)
      Promise.allSettled(eventTriggers).then((results) => {
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const data = result.value;
            if (data.success) {
              console.log(`✓ ${data.service} event triggered successfully`);
            } else {
              console.warn(`✗ ${data.service} event failed: ${data.error}`);
            }
          } else if (result.status === 'rejected') {
            console.error('Event trigger rejected:', result.reason);
          }
        });
      });
    }
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
   
// UPDATE customer
const updateCustomer = async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(req.params.customerId, req.body);
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE customer
const deleteCustomer = async (req, res) => {
  try {
    await customerService.deleteCustomer(req.params.customerId);
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// SEARCH customers
const searchCustomers = async (req, res) => {
  try {
    const customers = await customerService.searchCustomers(req.params.term);
    res.status(200).json({
      success: true,
      message: 'Search results fetched successfully',
      data: customers,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};
