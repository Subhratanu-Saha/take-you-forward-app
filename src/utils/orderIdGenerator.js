const generateRandomAlphaNumeric = require('./idGenerator');

const generateOrderId = () => {
    const timestamp = Date.now();
    const randomStr = generateRandomAlphaNumeric();

    return `ORD-${timestamp}-${randomStr}`;
};
module.exports = generateOrderId;
