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
const { authenticate, authorizeRoles, ROLES } = require('../middleware/authMiddleware');

// Domain Security Guards: Customer routes require SUPER_ADMIN, STORE_MANAGER, or SUPPORT_AGENT
router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_AGENT));
/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers
 *     description: "Retrieve a list of all customers. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Customers
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
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
 *     description: "Search for customers using a search term. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
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
 *     description: "Retrieve a customer using their customer ID. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
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
 *     description: "Create a new customer account. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
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
 *     description: "Update an existing customer's information. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
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
 *     description: "Delete an existing customer using their customer ID. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// DELETE customer [/api/v1/customers/:customerId]
router.delete('/:customerId', validateDeleteCustomer, customerController.deleteCustomer);

module.exports = router;