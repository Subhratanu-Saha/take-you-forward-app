const customerModel = require('../models/customer');

// ==================== ID GENERATOR ====================
const generateCustomerId = () => {
  const timestamp = Date.now();

  const randomStr = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `CUST-${timestamp}-${randomStr}`;
};

// ==================== VALIDATION HELPERS ====================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validatePincode = (pincode) => {
  return /^\d{6}$/.test(pincode);
};

// ==================== CREATE CUSTOMER ====================
const createCustomer = async (customerData) => {
  // Validate required fields
  if (!customerData.firstname?.trim()) {
    throw new Error('First name is required');
  }

  if (!customerData.emailadd?.trim()) {
    throw new Error('Email is required');
  }

  if (!validateEmail(customerData.emailadd)) {
    throw new Error('Invalid email format');
  }

  if (!customerData.contactnum?.trim()) {
    throw new Error('Contact number is required');
  }

  if (!validatePhone(customerData.contactnum)) {
    throw new Error('Invalid phone number (must be 10 digits)');
  }

  if (!customerData.addressline1?.trim()) {
    throw new Error('Address is required');
  }

  if (!customerData.city?.trim()) {
    throw new Error('City is required');
  }

  if (!customerData.pincode?.trim()) {
    throw new Error('Pincode is required');
  }

  if (!validatePincode(customerData.pincode)) {
    throw new Error('Invalid pincode (must be 6 digits)');
  }

  // Check if email already exists
  const existing = await customerModel.getCustomerByEmail(customerData.emailadd);
  if (existing) {
    throw new Error('Email already registered');
  }

  // Validate DOB
  if (customerData.dob) {
    const dob = new Date(customerData.dob);
    const age = Math.floor(
      (new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18) {
      throw new Error('Customer must be at least 18 years old');
    }

    if (age > 120) {
      throw new Error('Invalid date of birth');
    }
  }

  // ==================== AUTO GENERATE CUSTOMER ID ====================
  let customerid;
  let isUnique = false;

  while (!isUnique) {
    customerid = generateCustomerId();

    const existingId = await customerModel.getCustomerById(customerid);
    if (!existingId) {
      isUnique = true;
    }
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

  const customer = await customerModel.getCustomerById(customerid);

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Email validation
  if (customerData.emailadd && customerData.emailadd !== customer.emailadd) {
    if (!validateEmail(customerData.emailadd)) {
      throw new Error('Invalid email format');
    }

    const existing = await customerModel.getCustomerByEmail(
      customerData.emailadd
    );

    if (existing) {
      throw new Error('Email already in use by another customer');
    }
  }

  // Phone validation
  if (customerData.contactnum && !validatePhone(customerData.contactnum)) {
    throw new Error('Invalid phone number (must be 10 digits)');
  }

  // Pincode validation
  if (customerData.pincode && !validatePincode(customerData.pincode)) {
    throw new Error('Invalid pincode (must be 6 digits)');
  }

  // DOB validation
  if (customerData.dob) {
    const dob = new Date(customerData.dob);
    const age = Math.floor(
      (new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18 || age > 120) {
      throw new Error('Invalid date of birth');
    }
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