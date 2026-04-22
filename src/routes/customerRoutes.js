const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { validateCreateCustomer } = require('../middleware/customerValidator');

const {
    validateCustomerId,
    validateGetAllCustomers,
} = require('../middleware/customerRequestValidator');

// GET all customers [/api/v1/customers]
router.get('/',validateGetAllCustomers,customerController.getAllCustomers);

// SEARCH customers [/api/v1/customers/search/:term]
router.get('/search/:term', customerController.searchCustomers);

// GET customer by ID [/api/v1/customers/:customerId]
router.get('/:customerId',validateCustomerId,customerController.getCustomerById);

// CREATE new customer [/api/v1/customers]
router.post('/', validateCreateCustomer, customerController.createCustomer);

// UPDATE customer [/api/v1/customers/:customerId]
router.put('/:customerId', customerController.updateCustomer);

// DELETE customer [/api/v1/customers/:customerId]
router.delete('/:customerId', customerController.deleteCustomer);

module.exports = router;