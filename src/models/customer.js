const prisma = require('../utils/db');
const { logger, handlePrismaError } = require('../utils/db');

// Get all customers
const getAllCustomers = async (requestId = null) => {
  logger.info('CUSTOMER_MODEL', 'Fetching all customers from database', { requestId, operation: 'getAllCustomers' });
  try {
    const customers = await prisma.customer.findMany();
    logger.info('CUSTOMER_MODEL', `Successfully fetched ${customers.length} customers`, { requestId, operation: 'getAllCustomers' });
    return customers;
  } catch (error) {
    throw handlePrismaError(error, { operation: 'getAllCustomers', model: 'CUSTOMER_MODEL', requestId });
  }
};

// Get customer by ID
const getCustomerById = async (customerid, requestId = null) => {
  logger.info('CUSTOMER_MODEL', `Fetching customer by ID: ${customerid}`, { requestId, operation: 'getCustomerById', customerId: customerid });
  try {
    const customer = await prisma.customer.findUnique({
      where: { customerid },
    });
    return customer;
  } catch (error) {
    throw handlePrismaError(error, { operation: 'getCustomerById', model: 'CUSTOMER_MODEL', requestId, resourceId: customerid });
  }
};

// Get customer by email
const getCustomerByEmail = async (emailadd, requestId = null) => {
  logger.info('CUSTOMER_MODEL', 'Fetching customer by email', { requestId, operation: 'getCustomerByEmail' });
  try {
    return await prisma.customer.findUnique({
      where: { emailadd },
    });
  } catch (error) {
    throw handlePrismaError(error, { operation: 'getCustomerByEmail', model: 'CUSTOMER_MODEL', requestId });
  }
};

// Get customer by contact number
const getCustomerByContactNum = async (contactnum, requestId = null) => {
  logger.info('CUSTOMER_MODEL', 'Fetching customer by contact number', { requestId, operation: 'getCustomerByContactNum' });
  try {
    return await prisma.customer.findFirst({
      where: { contactnum },
    });
  } catch (error) {
    throw handlePrismaError(error, { operation: 'getCustomerByContactNum', model: 'CUSTOMER_MODEL', requestId });
  }
};

// Create a new customer
const createCustomer = async (customerData, requestId = null) => {
  logger.info('CUSTOMER_MODEL', `Creating new customer in DB: ${customerData.customerid}`, {
    requestId,
    operation: 'createCustomer',
    customerId: customerData.customerid,
  });

  try {
    const createdCustomer = await prisma.customer.create({
      data: {
        customerid: customerData.customerid,
        firstname: customerData.firstname,
        lastname: customerData.lastname || null,
        emailadd: customerData.emailadd,
        contactnum: customerData.contactnum || null,
        addressline1: customerData.addressline1,
        addressline2: customerData.addressline2 || null,
        city: customerData.city,
        pincode: customerData.pincode,
        gender: customerData.gender || null,
        dob: new Date(customerData.dob),
        isloyalty: customerData.isloyalty || false,
        sysenrollmentdt: new Date(),
        syslastmodifieddt: new Date(),
      },
    });

    logger.info('CUSTOMER_MODEL', `Successfully created customer: ${createdCustomer.customerid}`, {
      requestId,
      operation: 'createCustomer',
      customerId: createdCustomer.customerid,
    });

    return createdCustomer;
  } catch (error) {
    throw handlePrismaError(error, { operation: 'createCustomer', model: 'CUSTOMER_MODEL', requestId, resourceId: customerData.customerid });
  }
};

// Update customer
const updateCustomer = async (customerid, customerData, requestId = null) => {
  logger.info('CUSTOMER_MODEL', `Updating customer in DB: ${customerid}`, {
    requestId,
    operation: 'updateCustomer',
    customerId: customerid,
  });

  try {
    const updatedCustomer = await prisma.customer.update({
      where: { customerid },
      data: {
        firstname: customerData.firstname,
        lastname: customerData.lastname,
        contactnum: customerData.contactnum,
        addressline1: customerData.addressline1,
        addressline2: customerData.addressline2,
        city: customerData.city,
        pincode: customerData.pincode,
        gender: customerData.gender,
        dob: customerData.dob ? new Date(customerData.dob) : undefined,
        isloyalty: customerData.isloyalty,
        syslastmodifieddt: new Date(),
      },
    });

    logger.info('CUSTOMER_MODEL', `Successfully updated customer: ${customerid}`, {
      requestId,
      operation: 'updateCustomer',
      customerId: customerid,
    });

    return updatedCustomer;
  } catch (error) {
    throw handlePrismaError(error, { operation: 'updateCustomer', model: 'CUSTOMER_MODEL', requestId, resourceId: customerid });
  }
};

// Delete customer
const deleteCustomer = async (customerid, requestId = null) => {
  logger.info('CUSTOMER_MODEL', `Deleting customer from DB: ${customerid}`, {
    requestId,
    operation: 'deleteCustomer',
    customerId: customerid,
  });

  try {
    const deletedCustomer = await prisma.customer.delete({
      where: { customerid },
    });

    logger.info('CUSTOMER_MODEL', `Successfully deleted customer: ${customerid}`, {
      requestId,
      operation: 'deleteCustomer',
      customerId: customerid,
    });

    return deletedCustomer;
  } catch (error) {
    throw handlePrismaError(error, { operation: 'deleteCustomer', model: 'CUSTOMER_MODEL', requestId, resourceId: customerid });
  }
};

// Search customers
const searchCustomers = async (searchTerm, requestId = null) => {
  logger.info('CUSTOMER_MODEL', `Searching customers in DB with term: ${searchTerm}`, {
    requestId,
    operation: 'searchCustomers',
  });

  try {
    const results = await prisma.customer.findMany({
      where: {
        OR: [
          { firstname: { contains: searchTerm, mode: 'insensitive' } },
          { lastname: { contains: searchTerm, mode: 'insensitive' } },
          { emailadd: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    });

    logger.info('CUSTOMER_MODEL', `Found ${results.length} search results`, {
      requestId,
      operation: 'searchCustomers',
    });

    return results;
  } catch (error) {
    throw handlePrismaError(error, { operation: 'searchCustomers', model: 'CUSTOMER_MODEL', requestId });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerByEmail,
  getCustomerByContactNum,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};