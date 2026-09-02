const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateDeleteCustomer,
  validateCustomerId,
  validateGetAllCustomers,
} = require('../middleware/customerValidator');


/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers
 *     description: Retrieve a list of all customers.
 *     tags:
 *       - Customers
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       500:
 *         description: Internal server error
 */
// GET all customers [/api/v1/customers]
router.get('/', validateGetAllCustomers, customerController.getAllCustomers);

/**
 * @swagger
 * /api/v1/customers/search/{term}:
 *   get:
 *     summary: Search customers
 *     description: Search for customers using a search term.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: term
 *         required: true
 *         description: Search term
 *         schema:
 *           type: string
 *         example: Souvik
 *     responses:
 *       200:
 *         description: Customers matching the search term retrieved successfully
 *       404:
 *         description: No customers found
 *       500:
 *         description: Internal server error
 */
// SEARCH customers [/api/v1/customers/search/:term]
router.get('/search/:term', customerController.searchCustomers);

/**
 * @swagger
 * /api/v1/customers/{customerId}:
 *   get:
 *     summary: Get customer by ID
 *     description: Retrieve a customer using their customer ID.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Unique customer ID
 *         schema:
 *           type: string
 *         example: CUST-1750000000000-ABC123
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// GET customer by ID [/api/v1/customers/:customerId]
router.get('/:customerId', validateCustomerId, customerController.getCustomerById);

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create a new customer
 *     description: Create a new customer account.
 *     tags:
 *       - Customers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

// CREATE new customer [/api/v1/customers]
router.post('/', validateCreateCustomer, customerController.createCustomer);

/**
 * @swagger
 * /api/v1/customers/{customerId}:
 *   put:
 *     summary: Update customer
 *     description: Update an existing customer's information.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Unique customer ID
 *         schema:
 *           type: string
 *         example: CUST-1750000000000-ABC123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// UPDATE customer [/api/v1/customers/:customerId]
router.put('/:customerId', validateUpdateCustomer, customerController.updateCustomer);

/**
 * @swagger
 * /api/v1/customers/{customerId}:
 *   delete:
 *     summary: Delete customer
 *     description: Delete an existing customer using their customer ID.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Unique customer ID
 *         schema:
 *           type: string
 *         example: CUST-1750000000000-ABC123
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// DELETE customer [/api/v1/customers/:customerId]
router.delete('/:customerId', validateDeleteCustomer, customerController.deleteCustomer);

module.exports = router;