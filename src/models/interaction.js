const prisma = require('../utils/db');
const generateRandomAlphaNumeric = require('../utils/idGenerator');

/**
 * Generate a readable interaction ID when the client does not send one.
 * This keeps the create flow working even if the request body only contains
 * the interaction details and customer reference.
 */
const generateInteractionId = () => {
  const timestamp = Date.now();
  const randomStr = generateRandomAlphaNumeric(6);  

  return `INT-${timestamp}-${randomStr}`;
};

// Fetch every interaction record from the database.

const getAllInteractions = async () => {
    try {
        return await prisma.interaction.findMany();
    } catch (error) {
        throw new Error(`Error fetching interactions: ${error.message}`);
    }   
};
 
// Fetch a single interaction by its primary key(ID).
 
const getInteractionById = async (interactionId) => {
    try {
        return await prisma.interaction.findUnique({
            where: { interactionid: interactionId },
        });
    } catch (error) {
        throw new Error(`Error fetching interaction by ID: ${error.message}`);
    }
};

// Fetch the first interaction row for a customer.
 
const getFirstInteractionByCustomerId = async (customerId) => {
    try {
        return await prisma.interaction.findFirst({
            where: { customerid: customerId },
        });
    } catch (error) {
        throw new Error(`Error fetching first interaction by customer ID: ${error.message}`);
    }
};

// Insert a new interaction record into the downstream interaction table.

const createInteraction = async (interactionData) => {
    try {
        return await prisma.interaction.create({
            data: {
                // Use the provided ID when present; otherwise generate one.
                interactionid: interactionData.interactionid || generateInteractionId(),
                customerid: interactionData.customerid,   
                interactionmode: interactionData.interactionmode, 
                interactionvalue: interactionData.interactionvalue,
                interactiontype: interactionData.interactiontype,
                syslastmodifieddt: new Date(),
            },
        });
    } catch (error) {
        throw new Error(`Error creating interaction: ${error.message}`);
    }       
};

// Update an existing interaction row by primary key(ID).

const updateInteraction = async (interactionId, interactionData) => {
    try {
        return await prisma.interaction.update({
            where: { interactionid: interactionId },
            data: {
                interactionmode: interactionData.interactionmode,
                interactionvalue: interactionData.interactionvalue,
                interactiontype: interactionData.interactiontype,
                syslastmodifieddt: new Date(),
            },
        });
    } catch (error) {        
        throw new Error(`Error updating interaction: ${error.message}`);
    }
};

module.exports = {
    getAllInteractions,
    getInteractionById,
    getFirstInteractionByCustomerId,
    createInteraction,
    updateInteraction,
};