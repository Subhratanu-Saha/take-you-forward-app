const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { validateCreateCustomer } = require('../middleware/customerValidator');

// GET all customers [/api/v1/customers]
router.get('/', customerController.getAllCustomers);

// SEARCH customers [/api/v1/customers/search/:term]
router.get('/search/:term', customerController.searchCustomers);

// GET customer by ID [/api/v1/customers/:customerId]
router.get('/:customerId', customerController.getCustomerById);

// CREATE new customer [/api/v1/customers]
router.post('/', validateCreateCustomer, customerController.createCustomer);

// UPDATE customer [/api/v1/customers/:customerId]
router.put('/:customerId', customerController.updateCustomer);

// DELETE customer [/api/v1/customers/:customerId]
router.delete('/:customerId', customerController.deleteCustomer);

module.exports = router;