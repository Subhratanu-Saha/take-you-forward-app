const isPlainObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const validateCreatePromotionalMessage = (req, res, next) => {
    if (!isPlainObject(req.body)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: ['Request body must be a JSON object'],
        });
    }
2 
    const errors = [];

    const { title, message } = req.body;

    if (title === undefined) {
        errors.push('Title is required');
    } else if (typeof title !== 'string') {
        errors.push('Title must be a string');
    } else if (!title.trim()) {
        errors.push('Title cannot be empty'
            
        );
    } else if (title.trim().length > 120) {
        errors.push('Title must not exceed 120 characters');
    }

    if (message === undefined) {
        errors.push('Message is required');
    } else if (typeof message !== 'string') {
        errors.push('Message must be a string');
    } else if (!message.trim()) {
        errors.push('Message cannot be empty');
    } else if (message.trim().length > 5000) {
        errors.push('Message must not exceed 5000 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
        });
    }

    req.body = {
        ...req.body,
        title: title.trim(),
        message: message.trim(),
    };

    next();
};

module.exports = {
    validateCreatePromotionalMessage,
};