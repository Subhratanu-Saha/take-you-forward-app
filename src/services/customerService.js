const customerModel = require('../models/customer');
const { checkProtectedFields } = require('../middleware/customerValidator');
// Business logic: Create customer with validation
const createCustomer = async (customerData) => {
  // Check if customer already exists
  const existing = await customerModel.getCustomerByEmail(customerData.emailadd);
  if (existing) {
    throw new Error('Email already registered');
  }
  

  
  // Attach ID to customer data
  const newCustomerData = {
    ...customerData,
    customerid,
  };

  // Save to DB
  return await customerModel.createCustomer(newCustomerData);
};

// ==================== GET ALL ====================
const getAllCustomers = async () => {
  return await customerModel.getAllCustomers();
};

// ==================== GET BY ID ====================
const getCustomerById = async (customerid) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }

  const customer = await customerModel.getCustomerById(customerid);

  if (!customer) {
    throw new Error('Customer not found');
  }

  return customer;
};

// ==================== UPDATE ====================
const updateCustomer = async (customerid, customerData) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }

  // Guard: Check for protected fields
  const protectedFieldsInRequest = checkProtectedFields(customerData);
  if (protectedFieldsInRequest.length > 0) {
    throw new Error(`You cannot update these fields: ${protectedFieldsInRequest.join(', ')}`);
  }

  const customer = await customerModel.getCustomerById(customerid);

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Phone validation (allowed to update)
  if (customerData.contactnum && !validatePhone(customerData.contactnum)) {
    throw new Error('Invalid phone number (must be 10 digits)');
  }

  // Pincode validation (allowed to update)
  if (customerData.pincode && !validatePincode(customerData.pincode)) {
    throw new Error('Invalid pincode (must be 6 digits)');
  }

  return await customerModel.updateCustomer(customerid, customerData);
};

// ==================== DELETE ====================
const deleteCustomer = async (customerid) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }

  const customer = await customerModel.getCustomerById(customerid);

  if (!customer) {
    throw new Error('Customer not found');
  }

  return await customerModel.deleteCustomer(customerid);
};

// ==================== SEARCH ====================
const searchCustomers = async (searchTerm) => {
  if (!searchTerm?.trim()) {
    throw new Error('Search term is required');
  }

  if (searchTerm.trim().length < 2) {
    throw new Error('Search term must be at least 2 characters');
  }

  return await customerModel.searchCustomers(searchTerm);
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};