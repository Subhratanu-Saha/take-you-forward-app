const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'Take You Forward App API',
            version: '1.0.0',
            description: 'API documentation for Take You Forward App',
        },

        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local development server',
            },
        ],

        components: {
            schemas: {

                // =========================
                // CUSTOMER SCHEMA
                // =========================
                Customer: {
                    type: 'object',
                    properties: {
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        firstname: {
                            type: 'string',
                            example: 'Souvik',
                        },
                        lastname: {
                            type: 'string',
                            example: 'Sarkar',
                        },
                        emailadd: {
                            type: 'string',
                            format: 'email',
                            example: 'souvik@example.com',
                        },
                        contactnum: {
                            type: 'string',
                            example: '9876543210',
                        },
                        addressline1: {
                            type: 'string',
                            example: '123 Main Street',
                        },
                        addressline2: {
                            type: 'string',
                            example: 'Near City Center',
                        },
                        city: {
                            type: 'string',
                            example: 'Kolkata',
                        },
                        pincode: {
                            type: 'string',
                            example: '700001',
                        },
                        gender: {
                            type: 'string',
                            example: 'M',
                        },
                        dob: {
                            type: 'string',
                            format: 'date',
                            example: '2000-01-15',
                        },
                    },
                },

                // =========================
                // ORDER SCHEMA
                // =========================
                Order: {
                    type: 'object',
                    properties: {
                        orderid: {
                            type: 'string',
                            example: 'ORD-1750000000000-XYZ123',
                        },
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        totalamount: {
                            type: 'number',
                            format: 'double',
                            example: 5000,
                        },
                        status: {
                            type: 'string',
                            example: 'PLACED',
                        },
                    },
                },

                // =========================
                // LOYALTY SCHEMA
                // =========================
                Loyalty: {
                    type: 'object',
                    properties: {
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        totalpoints: {
                            type: 'integer',
                            example: 6000,
                        },
                        tier: {
                            type: 'string',
                            example: 'Silver',
                            enum:
                                [
                                    'Bronze',
                                    'Silver',
                                    'Gold',
                                ],
                        },
                    },
                },

                // =========================
                // ERROR SCHEMA
                // =========================
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'Something went wrong',
                        },
                        errorCode: {
                            type: 'string',
                            example: 'INTERNAL_SERVER_ERROR',
                        },
                    },
                },
            },
        },
    },

    apis: [
        path.join(__dirname, '../app.js'),
        path.join(__dirname, '../routes/customerRoutes.js'),
        path.join(__dirname, '../routes/loyaltyRoutes.js'),
        path.join(__dirname, '../routes/orderRoutes.js'),
    ],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = {
    swaggerSpec,
    swaggerUi,
};
