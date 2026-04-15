const customerModel = require('../models/customer');
// Business logic: Create customer with validation
const createCustomer = async (customerData) => {
  // Check if customer already exists
  const existing = await customerModel.getCustomerByEmail(customerData.emailadd);
  if (existing) {
    throw new Error('Email already registered');
  }
  

  
  // Call model layer
  return await customerModel.createCustomer(customerData);
};

// Get all customers
const getAllCustomers = async () => {
  return await customerModel.getAllCustomers();
};

// Get customer by ID with existence check
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

// Update customer with validation
const updateCustomer = async (customerid, customerData) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }
  
  // Check if customer exists
  const customer = await customerModel.getCustomerById(customerid);
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // Validate email if provided and changed
  if (customerData.emailadd && customerData.emailadd !== customer.emailadd) {
    if (!validateEmail(customerData.emailadd)) {
      throw new Error('Invalid email format');
    }
    // Check if new email is already in use
    const existing = await customerModel.getCustomerByEmail(customerData.emailadd);
    if (existing) {
      throw new Error('Email already in use by another customer');
    }
  }
  
  // Validate phone if provided
  if (customerData.contactnum && !validatePhone(customerData.contactnum)) {
    throw new Error('Invalid phone number (must be 10 digits)');
  }
  
  // Validate pincode if provided
  if (customerData.pincode && !validatePincode(customerData.pincode)) {
    throw new Error('Invalid pincode (must be 6 digits)');
  }
  
  // Validate date of birth if provided
  if (customerData.dob) {
    const dob = new Date(customerData.dob);
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18 || age > 120) {
      throw new Error('Invalid date of birth');
    }
  }
  
  return await customerModel.updateCustomer(customerid, customerData);
};

// Delete customer
const deleteCustomer = async (customerid) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }
  
  // Check if customer exists before deleting
  const customer = await customerModel.getCustomerById(customerid);
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  return await customerModel.deleteCustomer(customerid);
};

// Search customers
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
