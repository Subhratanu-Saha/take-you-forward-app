const prisma = require('../utils/db');
const generateRandomAlphaNumeric = require('../utils/idGenerator');
const crypto = require('crypto');

const getPromotionalCampaignValue = (campaignId) =>
  `PROMO_${crypto.createHash('sha256').update(campaignId).digest('hex').slice(0, 32)}`;

const logModelError = (operation, details, error) => {
  console.error(`[INTERACTION_MODEL] ${operation} failed`, {
    ...details,
    message: error?.message,
    stack: error?.stack,
  });
};

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
  console.log('[INTERACTION_MODEL] Fetching all interaction records');

  try {
    const interactions = await prisma.interaction.findMany();
    console.log(`[INTERACTION_MODEL] Retrieved ${interactions.length} interaction records`);
    return interactions;
  } catch (error) {
    logModelError('fetch all interactions', {}, error);
    throw new Error(`Error fetching interactions: ${error.message}`);
  }
};

// Fetch a single interaction by its primary key(ID).
const getInteractionById = async (interactionId) => {
  const normalizedId = interactionId?.trim();
  console.log(`[INTERACTION_MODEL] Fetching interaction record for interactionId=${normalizedId || 'unknown'}`);

  if (!normalizedId) {
    console.warn('[INTERACTION_MODEL] Interaction ID is missing');
    throw new Error('Interaction ID is required');
  }

  try {
    const interaction = await prisma.interaction.findUnique({
      where: { interactionid: normalizedId },
    });

    if (!interaction) {
      console.warn(`[INTERACTION_MODEL] No interaction found for interactionId=${normalizedId}`);
    }

    return interaction;
  } catch (error) {
    logModelError('fetch interaction by ID', { interactionId: normalizedId }, error);
    throw new Error(`Error fetching interaction by ID: ${error.message}`);
  }
};

// Fetch the first interaction row for a customer.
const getFirstInteractionByCustomerId = async (customerId) => {
  const normalizedCustomerId = customerId?.trim();
  console.log(`[INTERACTION_MODEL] Fetching first interaction for customerId=${normalizedCustomerId || 'unknown'}`);

  try {
    const interaction = await prisma.interaction.findFirst({
      where: { customerid: normalizedCustomerId },
    });

    if (!interaction) {
      console.warn(`[INTERACTION_MODEL] No first interaction found for customerId=${normalizedCustomerId}`);
    }

    return interaction;
  } catch (error) {
    logModelError('fetch first interaction by customer ID', { customerId: normalizedCustomerId }, error);
    throw new Error(`Error fetching first interaction by customer ID: ${error.message}`);
  }
};

const hasPromotionalCampaignInteraction = async (customerId, campaignId) => {
  return Boolean(await prisma.interaction.findFirst({
    where: {
      customerid: customerId,
      interactionvalue: getPromotionalCampaignValue(campaignId),
      interactionmode: 'EMAIL',
      interactiontype: 'PROMOTIONAL',
    },
    select: { interactionid: true },
  }));
};

// Insert a new interaction record into the downstream interaction table.
const createInteraction = async (interactionData) => {
  const requiredFields = ['customerid', 'interactionmode', 'interactionvalue', 'interactiontype'];
  const missingFields = requiredFields.filter((field) => !interactionData?.[field]?.toString().trim());

  console.log('[INTERACTION_MODEL] Creating interaction record', {
    customerId: interactionData?.customerid,
    interactionType: interactionData?.interactiontype,
  });

  if (missingFields.length) {
    console.warn('[INTERACTION_MODEL] Missing required interaction fields', { missingFields });
    throw new Error(`Missing required interaction fields: ${missingFields.join(', ')}`);
  }

  try {
    const createdInteraction = await prisma.interaction.create({
      data: {
        interactionid: interactionData.interactionid || generateInteractionId(),
        customerid: interactionData.customerid,
        interactionmode: interactionData.interactionmode,
        interactionvalue: interactionData.interactionvalue,
        interactiontype: interactionData.interactiontype,
        syslastmodifieddt: new Date(),
      },
    });

    console.log('[INTERACTION_MODEL] Interaction record created successfully', {
      interactionId: createdInteraction?.interactionid,
      customerId: createdInteraction?.customerid,
    });

    return createdInteraction;
  } catch (error) {
    logModelError('create interaction', {
      customerId: interactionData?.customerid,
      interactionType: interactionData?.interactiontype,
    }, error);
    throw new Error(`Error creating interaction: ${error.message}`);
  }
};

// Update an existing interaction row by primary key(ID).
const updateInteraction = async (interactionId, interactionData) => {
  const normalizedId = interactionId?.trim();
  console.log(`[INTERACTION_MODEL] Updating interaction record for interactionId=${normalizedId || 'unknown'}`);

  if (!normalizedId) {
    console.warn('[INTERACTION_MODEL] Interaction ID is missing for update');
    throw new Error('Interaction ID is required');
  }

  try {
    const updatedInteraction = await prisma.interaction.update({
      where: { interactionid: normalizedId },
      data: {
        interactionmode: interactionData?.interactionmode,
        interactionvalue: interactionData?.interactionvalue,
        interactiontype: interactionData?.interactiontype,
        syslastmodifieddt: new Date(),
      },
    });

    console.log('[INTERACTION_MODEL] Interaction record updated successfully', {
      interactionId: updatedInteraction?.interactionid,
    });

    return updatedInteraction;
  } catch (error) {
    logModelError('update interaction', { interactionId: normalizedId }, error);
    throw new Error(`Error updating interaction: ${error.message}`);
  }
};

const deleteInteraction = async (interactionId) => {
  const normalizedId = interactionId?.trim();

  if (!normalizedId) {
    throw new Error('Interaction ID is required');
  }

  try {
    return await prisma.interaction.delete({
      where: { interactionid: normalizedId },
    });
  } catch (error) {
    logModelError('delete interaction', { interactionId: normalizedId }, error);
    throw new Error(`Error deleting interaction: ${error.message}`);
  }
};

module.exports = {
  getAllInteractions,
  getInteractionById,
  getFirstInteractionByCustomerId,
  hasPromotionalCampaignInteraction,
  getPromotionalCampaignValue,
  createInteraction,
  updateInteraction,
  deleteInteraction,
};