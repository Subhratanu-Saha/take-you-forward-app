const {
  INTERACTION_MODE,
  INTERACTION_TYPE,
  INTERACTION_VALUE
} = require('../constants/constant');

const validateCreateInteraction = (req, res, next) => {
  const {
    customerid,
    interactionmode,
    interactionvalue,
    interactiontype,
  } = req.body;

  const errors = [];

  if (!customerid?.trim()) {
    errors.push('Customer ID is required');
  }

  if (!interactionmode?.trim()) {
    errors.push('Interaction mode is required');
  } else if (!Object.values(INTERACTION_MODE).includes(interactionmode)) {
    errors.push(
      `Interaction mode must be one of: ${Object.keys(INTERACTION_MODE).join(', ')}`
    );
  }

  if (!interactionvalue?.trim()) {
    errors.push('Interaction value is required');
  } else if (!Object.values(INTERACTION_VALUE).includes(interactionvalue)) {
    errors.push(
      `Interaction value must be one of: ${Object.keys(INTERACTION_VALUE).join(', ')}`
    );
  }

  if (!interactiontype?.trim()) {
    errors.push('Interaction type is required');
  } else if (!Object.values(INTERACTION_TYPE).includes(interactiontype)) {
    errors.push(
      `Interaction type must be one of: ${Object.keys(INTERACTION_TYPE).join(', ')}`
    );
  }

  if (errors.length) {
    console.warn('[INTERACTION_VALIDATOR] Create interaction validation failed', {
      path: req.originalUrl,
      errors,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  console.log(`[INTERACTION_VALIDATOR] Create interaction validation passed for ${req.method} ${req.originalUrl}`);
  next();
};

const validateUpdateInteraction = (req, res, next) => {
  const { interactionId } = req.params;
  const {
    interactionmode,
    interactionvalue,
    interactiontype,
  } = req.body;

  const errors = [];

  if (!interactionId?.trim()) {
    errors.push('Interaction ID is required');
  }

  if (interactionmode !== undefined && !interactionmode?.trim()) {
    errors.push('Interaction mode cannot be empty');
  } else if (interactionmode && !Object.values(INTERACTION_MODE).includes(interactionmode)
  ) {
    errors.push(
      `Interaction mode must be one of: ${Object.keys(INTERACTION_MODE).join(', ')}`
    );
  }

  if (interactionvalue !== undefined && !interactionvalue?.trim()) {
    errors.push('Interaction value cannot be empty');
  } else if (interactionvalue && !Object.values(INTERACTION_VALUE).includes(interactionvalue)
  ) {
    errors.push(
      `Interaction value must be one of: ${Object.keys(INTERACTION_VALUE).join(', ')}`
    );
  }

  if (interactiontype !== undefined && !interactiontype?.trim()) {
    errors.push('Interaction type cannot be empty');
  } else if (interactiontype && !Object.values(INTERACTION_TYPE).includes(interactiontype)) {
    errors.push(
      `Interaction type must be one of: ${Object.keys(INTERACTION_TYPE).join(', ')}`
    );
  }

  if (errors.length) {
    console.warn('[INTERACTION_VALIDATOR] Update interaction validation failed', {
      path: req.originalUrl,
      interactionId,
      errors,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  console.log(`[INTERACTION_VALIDATOR] Update interaction validation passed for ${req.method} ${req.originalUrl}`);
  next();
};

const validateDeleteInteraction = (req, res, next) => {
  const { interactionId } = req.params;
  const errors = [];

  if (!interactionId?.trim()) {
    errors.push('Interaction ID is required');
  }

  if (errors.length) {
    console.warn('[INTERACTION_VALIDATOR] Delete interaction validation failed', {
      path: req.originalUrl,
      interactionId,
      errors,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  console.log(`[INTERACTION_VALIDATOR] Delete interaction validation passed for ${req.method} ${req.originalUrl}`);
  next();
};

module.exports = {
  validateCreateInteraction,
  validateUpdateInteraction,
  validateDeleteInteraction,
};
