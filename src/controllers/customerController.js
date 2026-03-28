const customerService = require('../services/customerService');

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
