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
            parameters: {
                RequestId: {
                    name: 'X-Request-Id',
                    in: 'header',
                    required: false,
                    description: 'Optional client-supplied correlation ID. A UUID is generated when omitted.',
                    schema: {
                        type: 'string',
                        example: '550e8400-e29b-41d4-a716-446655440000',
                    },
                },
            },
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

                // =========================
                // STANDARDIZED ERROR RESPONSES
                // =========================
                ValidationErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'Validation failed',
                        },
                        errorCode: {
                            type: 'string',
                            example: 'VALIDATION_ERROR',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            example: [
                                'Interaction mode must be one of: SIGNUP',
                            ],
                        },
                    },
                },

                NotFoundErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'Resource not found',
                        },
                        errorCode: {
                            type: 'string',
                            example: 'ROUTE_NOT_FOUND',
                        },
                        path: {
                            type: 'string',
                            example: '/api/v1/invalid-route',
                        },
                    },
                },

                ServerErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'Internal server error',
                        },
                        errorCode: {
                            type: 'string',
                            example: 'INTERNAL_SERVER_ERROR',
                        },
                    },
                },

                // =========================
                // INTERACTION SCHEMA
                // =========================
                Interaction: {
                    type: 'object',
                    properties: {
                        interactionid: {
                            type: 'string',
                            example: 'INT-1750000000000-ABC123',
                        },
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        interactionmode: {
                            type: 'string',
                            enum: ['SIGNUP'],
                            example: 'SIGNUP',
                        },
                        interactiontype: {
                            type: 'string',
                            enum: ['SYSTEM'],
                            example: 'SYSTEM',
                        },
                        interactionvalue: {
                            type: 'string',
                            enum: ['ACCOUNT_CREATION'],
                            example: 'ACCOUNT_CREATION',
                        },
                        syslastmodifieddt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2026-09-01T10:30:00.000Z',
                        },
                    },
                },

                // =========================
                // SUBSCRIBER SCHEMA
                // =========================
                Subscriber: {
                    type: 'object',
                    properties: {
                        subscriberid: {
                            type: 'string',
                            example: 'SUB-1750000000000-ABC123',
                        },
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        issubscribe: {
                            type: 'boolean',
                            example: true,
                        },
                        emailpermstatus: {
                            type: 'boolean',
                            example: true,
                        },
                        smspermstatus: {
                            type: 'boolean',
                            example: false,
                        },
                        sysmodifieddt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2026-09-01T10:30:00.000Z',
                        },
                    },
                },

                // =========================
                // PROMOTIONAL MESSAGE SCHEMA
                // =========================
                PromotionalMessage: {
                    type: 'object',
                    properties: {
                        promotionalmessageid: {
                            type: 'string',
                            example: 'PM-1750000000000-ABC123',
                        },
                        campaignid: {
                            type: 'string',
                            example: 'CAM-1750000000000-XYZ789',
                        },
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        channel: {
                            type: 'string',
                            enum: ['EMAIL', 'SMS', 'PUSH'],
                            example: 'EMAIL',
                        },
                        status: {
                            type: 'string',
                            enum: ['SENT', 'PENDING', 'FAILED', 'DLQED'],
                            example: 'SENT',
                        },
                        createdat: {
                            type: 'string',
                            format: 'date-time',
                            example: '2026-09-01T10:30:00.000Z',
                        },
                    },
                },

                // =========================
                // PROMOTIONAL DLQ SCHEMA
                // =========================
                PromotionalDLQ: {
                    type: 'object',
                    properties: {
                        dlqid: {
                            type: 'string',
                            example: 'DLQ-1750000000000-ABC123',
                        },
                        promotionalmessageid: {
                            type: 'string',
                            example: 'PM-1750000000000-ABC123',
                        },
                        customerid: {
                            type: 'string',
                            example: 'CUST-1750000000000-ABC123',
                        },
                        reason: {
                            type: 'string',
                            example: 'Network timeout after 3 retries',
                        },
                        payload: {
                            type: 'object',
                            example: {
                                email: 'customer@example.com',
                                subject: 'Special Offer',
                                body: 'Get 50% discount',
                            },
                        },
                        retrycount: {
                            type: 'integer',
                            example: 3,
                        },
                        createdat: {
                            type: 'string',
                            format: 'date-time',
                            example: '2026-09-01T10:30:00.000Z',
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
        path.join(__dirname, '../routes/interactionRoutes.js'),
        path.join(__dirname, '../routes/subscriberRoutes.js'),
        path.join(__dirname, '../routes/promotionalMessageRoutes.js'),
    ],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = {
    swaggerSpec,
    swaggerUi,
};
