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
  }

  if (!interactionvalue?.trim()) {
    errors.push('Interaction value is required');
  }

  if (!interactiontype?.trim()) {
    errors.push('Interaction type is required');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

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
  }

  if (interactionvalue !== undefined && !interactionvalue?.trim()) {
    errors.push('Interaction value cannot be empty');
  }

  if (interactiontype !== undefined && !interactiontype?.trim()) {
    errors.push('Interaction type cannot be empty');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateDeleteInteraction = (req, res, next) => {
  const { interactionId } = req.params;
  const errors = [];

  if (!interactionId?.trim()) {
    errors.push('Interaction ID is required');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = {
  validateCreateInteraction,
  validateUpdateInteraction,
  validateDeleteInteraction,
};
