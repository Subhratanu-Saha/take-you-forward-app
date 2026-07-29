const customerModel = require('../models/customer');
const generateCustomerId = require('../utils/customerIdGenerator');
const { logger, ERROR_CODES, ConflictError, NotFoundError, ValidationError } = require('../utils/db');

// Business logic: Create customer with validation
const createCustomer = async (customerData, requestId = null) => {
  logger.info('CUSTOMER_SERVICE', 'Executing createCustomer business logic', { requestId, operation: 'createCustomer' });

  try {
    // Check if customer already exists
    const existing = await customerModel.getCustomerByEmail(customerData.emailadd, requestId);
    if (existing) {
      const err = new ConflictError('Email already registered', ERROR_CODES.CUSTOMER_ALREADY_EXISTS);
      logger.warn('CUSTOMER_SERVICE', 'Email already registered', {
        requestId,
        operation: 'createCustomer',
        statusCode: 409,
        errorCode: ERROR_CODES.CUSTOMER_ALREADY_EXISTS,
      });
      throw err;
    }

    // Check if contact number is already in use
    if (customerData.contactnum) {
      const existingContact = await customerModel.getCustomerByContactNum(customerData.contactnum, requestId);
      if (existingContact) {
        const err = new ConflictError('Contact number already registered', ERROR_CODES.CUSTOMER_ALREADY_EXISTS);
        logger.warn('CUSTOMER_SERVICE', 'Contact number already registered', {
          requestId,
          operation: 'createCustomer',
          statusCode: 409,
          errorCode: ERROR_CODES.CUSTOMER_ALREADY_EXISTS,
        });
        throw err;
      }
    }

    // Generate unique customer ID
    const customerid = generateCustomerId();

    // Attach ID to customer data
    const newCustomerData = {
      ...customerData,
      customerid,
    };

    // Save to DB
    const created = await customerModel.createCustomer(newCustomerData, requestId);
    logger.info('CUSTOMER_SERVICE', `Successfully created customer: ${created.customerid}`, {
      requestId,
      operation: 'createCustomer',
      customerId: created.customerid,
    });
    return created;
  } catch (error) {
    logger.error('CUSTOMER_SERVICE', `createCustomer failed: ${error.message}`, {
      requestId,
      operation: 'createCustomer',
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      error,
    });
    throw error;
  }
};

// ==================== GET ALL ====================
const getAllCustomers = async (requestId = null) => {
  logger.info('CUSTOMER_SERVICE', 'Executing getAllCustomers business logic', { requestId, operation: 'getAllCustomers' });
  try {
    const customers = await customerModel.getAllCustomers(requestId);
    logger.info('CUSTOMER_SERVICE', `getAllCustomers retrieved ${customers.length} records`, { requestId, operation: 'getAllCustomers' });
    return customers;
  } catch (error) {
    logger.error('CUSTOMER_SERVICE', `getAllCustomers failed: ${error.message}`, {
      requestId,
      operation: 'getAllCustomers',
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      error,
    });
    throw error;
  }
};

// ==================== GET BY ID ====================
const getCustomerById = async (customerid, requestId = null) => {
  logger.info('CUSTOMER_SERVICE', `Executing getCustomerById for ID: ${customerid}`, {
    requestId,
    operation: 'getCustomerById',
    customerId: customerid,
  });

  if (!customerid?.trim()) {
    const err = new ValidationError('Customer ID is required', ERROR_CODES.CUSTOMER_VALIDATION_FAILED);
    logger.warn('CUSTOMER_SERVICE', 'Customer ID is missing', { requestId, operation: 'getCustomerById' });
    throw err;
  }

  try {
    const customer = await customerModel.getCustomerById(customerid, requestId);

    if (!customer) {
      const err = new NotFoundError('Customer not found', ERROR_CODES.CUSTOMER_NOT_FOUND);
      logger.warn('CUSTOMER_SERVICE', `Customer not found for ID: ${customerid}`, {
        requestId,
        operation: 'getCustomerById',
        customerId: customerid,
        statusCode: 404,
        errorCode: ERROR_CODES.CUSTOMER_NOT_FOUND,
      });
      throw err;
    }

    logger.info('CUSTOMER_SERVICE', `getCustomerById retrieved customer: ${customerid}`, {
      requestId,
      operation: 'getCustomerById',
      customerId: customerid,
    });
    return customer;
  } catch (error) {
    logger.error('CUSTOMER_SERVICE', `getCustomerById failed: ${error.message}`, {
      requestId,
      operation: 'getCustomerById',
      customerId: customerid,
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      error,
    });
    throw error;
  }
};

// ==================== UPDATE ====================
const updateCustomer = async (customerid, customerData, requestId = null) => {
  logger.info('CUSTOMER_SERVICE', `Executing updateCustomer for ID: ${customerid}`, {
    requestId,
    operation: 'updateCustomer',
    customerId: customerid,
  });

  try {
    const customer = await customerModel.getCustomerById(customerid, requestId);
    if (!customer) {
      const err = new NotFoundError('Customer not found', ERROR_CODES.CUSTOMER_NOT_FOUND);
      logger.warn('CUSTOMER_SERVICE', `Update failed: customer not found: ${customerid}`, {
        requestId,
        operation: 'updateCustomer',
        customerId: customerid,
        statusCode: 404,
        errorCode: ERROR_CODES.CUSTOMER_NOT_FOUND,
      });
      throw err;
    }

    const updated = await customerModel.updateCustomer(customerid, customerData, requestId);
    logger.info('CUSTOMER_SERVICE', `Successfully updated customer: ${customerid}`, {
      requestId,
      operation: 'updateCustomer',
      customerId: customerid,
    });
    return updated;
  } catch (error) {
    logger.error('CUSTOMER_SERVICE', `updateCustomer failed: ${error.message}`, {
      requestId,
      operation: 'updateCustomer',
      customerId: customerid,
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      error,
    });
    throw error;
  }
};

// ==================== DELETE ====================
const deleteCustomer = async (customerid, requestId = null) => {
  logger.info('CUSTOMER_SERVICE', `Executing deleteCustomer for ID: ${customerid}`, {
    requestId,
    operation: 'deleteCustomer',
    customerId: customerid,
  });

  if (!customerid?.trim()) {
    const err = new ValidationError('Customer ID is required', ERROR_CODES.CUSTOMER_VALIDATION_FAILED);
    logger.warn('CUSTOMER_SERVICE', 'Delete failed: Customer ID is required', { requestId, operation: 'deleteCustomer' });
    throw err;
  }

  try {
    const customer = await customerModel.getCustomerById(customerid, requestId);

    if (!customer) {
      const err = new NotFoundError('Customer not found', ERROR_CODES.CUSTOMER_NOT_FOUND);
      logger.warn('CUSTOMER_SERVICE', `Delete failed: customer not found: ${customerid}`, {
        requestId,
        operation: 'deleteCustomer',
        customerId: customerid,
        statusCode: 404,
        errorCode: ERROR_CODES.CUSTOMER_NOT_FOUND,
      });
      throw err;
    }

    const deleted = await customerModel.deleteCustomer(customerid, requestId);
    logger.info('CUSTOMER_SERVICE', `Successfully deleted customer: ${customerid}`, {
      requestId,
      operation: 'deleteCustomer',
      customerId: customerid,
    });
    return deleted;
  } catch (error) {
    logger.error('CUSTOMER_SERVICE', `deleteCustomer failed: ${error.message}`, {
      requestId,
      operation: 'deleteCustomer',
      customerId: customerid,
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      error,
    });
    throw error;
  }
};

// ==================== SEARCH ====================
const searchCustomers = async (searchTerm, requestId = null) => {
  logger.info('CUSTOMER_SERVICE', `Executing searchCustomers for term: ${searchTerm}`, {
    requestId,
    operation: 'searchCustomers',
  });

  if (!searchTerm?.trim()) {
    const err = new ValidationError('Search term is required', ERROR_CODES.CUSTOMER_VALIDATION_FAILED);
    logger.warn('CUSTOMER_SERVICE', 'Search failed: empty search term', { requestId, operation: 'searchCustomers' });
    throw err;
  }

  if (searchTerm.trim().length < 2) {
    const err = new ValidationError('Search term must be at least 2 characters', ERROR_CODES.CUSTOMER_VALIDATION_FAILED);
    logger.warn('CUSTOMER_SERVICE', 'Search failed: search term too short', { requestId, operation: 'searchCustomers' });
    throw err;
  }

  try {
    const results = await customerModel.searchCustomers(searchTerm, requestId);
    logger.info('CUSTOMER_SERVICE', `searchCustomers returned ${results.length} results`, {
      requestId,
      operation: 'searchCustomers',
    });
    return results;
  } catch (error) {
    logger.error('CUSTOMER_SERVICE', `searchCustomers failed: ${error.message}`, {
      requestId,
      operation: 'searchCustomers',
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      error,
    });
    throw error;
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};