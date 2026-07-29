const customerService = require('../services/customerService');
const config = require('../config');
const { logger, ERROR_CODES } = require('../utils/db');
const { INTERACTION_MODE, INTERACTION_TYPE, INTERACTION_VALUE, PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT, PROMOTIONAL_ONBOARDING_EMAIL_MESSAGE } = require('../constants/constant');

// GET all customers
const getAllCustomers = async (req, res, next) => {
  logger.info('CUSTOMER_CONTROLLER', 'Handling getAllCustomers request', { operation: 'getAllCustomers' });

  try {
    const customers = await customerService.getAllCustomers();
    logger.info('CUSTOMER_CONTROLLER', `getAllCustomers succeeded with ${customers.length} records`, {
      operation: 'getAllCustomers',
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: customers,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    logger.error('CUSTOMER_CONTROLLER', `getAllCustomers failed: ${error.message}`, {
      operation: 'getAllCustomers',
      statusCode,
      errorCode,
      error,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// GET customer by ID
const getCustomerById = async (req, res, next) => {
  const customerId = req.params.customerId;

  logger.info('CUSTOMER_CONTROLLER', `Handling getCustomerById request for ID: ${customerId}`, {
    operation: 'getCustomerById',
    customerId,
  });

  try {
    const customer = await customerService.getCustomerById(customerId);
    logger.info('CUSTOMER_CONTROLLER', `getCustomerById succeeded for ID: ${customerId}`, {
      operation: 'getCustomerById',
      customerId,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Customer fetched successfully',
      data: customer,
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    const errorCode = error.errorCode || ERROR_CODES.CUSTOMER_NOT_FOUND;

    logger.warn('CUSTOMER_CONTROLLER', `getCustomerById failed for ID: ${customerId} - ${error.message}`, {
      operation: 'getCustomerById',
      customerId,
      statusCode,
      errorCode,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// CREATE new customer
const createCustomer = async (req, res, next) => {
  logger.info('CUSTOMER_CONTROLLER', 'Handling createCustomer request', { operation: 'createCustomer' });

  try {
    const customer = await customerService.createCustomer(req.body);
    if (customer) {
      // Trigger downstream events concurrently (non-blocking)
      const eventTriggers = [
        // Subscriber event trigger
        (async () => {
          const startTime = Date.now();
          try {
            const issubscribe = true;
            const emailpermstatus = true;
            const smspermstatus = true;
            const response = await fetch(`${config.apiBaseUrl}/api/v1/subscriber`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customerid: customer.customerid,
                issubscribe,
                emailpermstatus,
                smspermstatus,
              }),
            });
            const duration = Date.now() - startTime;
            if (!response.ok) {
              throw new Error(`Subscriber service returned status ${response.status}`);
            }
            logger.info('EXTERNAL_INTEGRATION', 'Subscriber event trigger succeeded', {
              service: 'subscriber',
              durationMs: duration,
              statusCode: response.status,
            });
            return { success: true, service: 'subscriber' };
          } catch (error) {
            logger.error('EXTERNAL_INTEGRATION', `Subscriber event trigger failed: ${error.message}`, {
              service: 'subscriber',
              error,
            });
            return { success: false, service: 'subscriber', error: error.message };
          }
        })(),

        // Interaction event trigger
        (async () => {
          const startTime = Date.now();
          try {
            const response = await fetch(`${config.apiBaseUrl}/api/v1/interactions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customerid: customer.customerid,
                interactionmode: INTERACTION_MODE.SIGNUP,
                interactiontype: INTERACTION_TYPE.SYSTEM,
                interactionvalue: INTERACTION_VALUE.ACCOUNT_CREATION,
              }),
            });
            const duration = Date.now() - startTime;
            if (!response.ok) {
              throw new Error(`Interaction service returned status ${response.status}`);
            }
            logger.info('EXTERNAL_INTEGRATION', 'Interaction event trigger succeeded', {
              service: 'interaction',
              durationMs: duration,
              statusCode: response.status,
            });
            return { success: true, service: 'interaction' };
          } catch (error) {
            logger.error('EXTERNAL_INTEGRATION', `Interaction event trigger failed: ${error.message}`, {
              service: 'interaction',
              error,
            });
            return { success: false, service: 'interaction', error: error.message };
          }
        })(),

        // Promotional message event trigger
        (async () => {
          const startTime = Date.now();
          try {
            const response = await fetch(`${config.apiBaseUrl}/api/v1/promotionalmessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customerid: customer.customerid,
                emailaddress: customer.emailadd,
                title: PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT,
                message: PROMOTIONAL_ONBOARDING_EMAIL_MESSAGE,
              }),
            });
            const duration = Date.now() - startTime;
            if (!response.ok) {
              throw new Error(`Promotional service returned status ${response.status}`);
            }
            logger.info('EXTERNAL_INTEGRATION', 'Promotional event trigger succeeded', {
              service: 'promotional',
              durationMs: duration,
              statusCode: response.status,
            });
            return { success: true, service: 'promotional' };
          } catch (error) {
            logger.error('EXTERNAL_INTEGRATION', `Promotional event trigger failed: ${error.message}`, {
              service: 'promotional',
              error,
            });
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
              logger.info('CUSTOMER_CONTROLLER', `✓ ${data.service} event triggered successfully`);
            } else {
              logger.warn('CUSTOMER_CONTROLLER', `✗ ${data.service} event failed: ${data.error}`);
            }
          } else if (result.status === 'rejected') {
            logger.error('CUSTOMER_CONTROLLER', `Event trigger rejected: ${result.reason}`);
          }
        });
      });
    }

    logger.info('CUSTOMER_CONTROLLER', `createCustomer succeeded for ID: ${customer.customerid}`, {
      operation: 'createCustomer',
      customerId: customer.customerid,
      statusCode: 201,
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    const errorCode = error.errorCode || ERROR_CODES.CUSTOMER_VALIDATION_FAILED;

    logger.warn('CUSTOMER_CONTROLLER', `createCustomer failed: ${error.message}`, {
      operation: 'createCustomer',
      statusCode,
      errorCode,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// UPDATE customer
const updateCustomer = async (req, res, next) => {
  const customerId = req.params.customerId;

  logger.info('CUSTOMER_CONTROLLER', `Handling updateCustomer request for ID: ${customerId}`, {
    operation: 'updateCustomer',
    customerId,
  });

  try {
    const customer = await customerService.updateCustomer(customerId, req.body);
    logger.info('CUSTOMER_CONTROLLER', `updateCustomer succeeded for ID: ${customerId}`, {
      operation: 'updateCustomer',
      customerId,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    const errorCode = error.errorCode || ERROR_CODES.CUSTOMER_VALIDATION_FAILED;

    logger.warn('CUSTOMER_CONTROLLER', `updateCustomer failed for ID: ${customerId} - ${error.message}`, {
      operation: 'updateCustomer',
      customerId,
      statusCode,
      errorCode,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// DELETE customer
const deleteCustomer = async (req, res, next) => {
  const customerId = req.params.customerId;

  logger.info('CUSTOMER_CONTROLLER', `Handling deleteCustomer request for ID: ${customerId}`, {
    operation: 'deleteCustomer',
    customerId,
  });

  try {
    await customerService.deleteCustomer(customerId);
    logger.info('CUSTOMER_CONTROLLER', `deleteCustomer succeeded for ID: ${customerId}`, {
      operation: 'deleteCustomer',
      customerId,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    const errorCode = error.errorCode || ERROR_CODES.CUSTOMER_VALIDATION_FAILED;

    logger.warn('CUSTOMER_CONTROLLER', `deleteCustomer failed for ID: ${customerId} - ${error.message}`, {
      operation: 'deleteCustomer',
      customerId,
      statusCode,
      errorCode,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// SEARCH customers
const searchCustomers = async (req, res, next) => {
  const term = req.params.term;

  logger.info('CUSTOMER_CONTROLLER', `Handling searchCustomers request for term: ${term}`, {
    operation: 'searchCustomers',
  });

  try {
    const customers = await customerService.searchCustomers(term);
    logger.info('CUSTOMER_CONTROLLER', `searchCustomers succeeded with ${customers.length} results`, {
      operation: 'searchCustomers',
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Search results fetched successfully',
      data: customers,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    const errorCode = error.errorCode || ERROR_CODES.CUSTOMER_VALIDATION_FAILED;

    logger.warn('CUSTOMER_CONTROLLER', `searchCustomers failed for term: ${term} - ${error.message}`, {
      operation: 'searchCustomers',
      statusCode,
      errorCode,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
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
