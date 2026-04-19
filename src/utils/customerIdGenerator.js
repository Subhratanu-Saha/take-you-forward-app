const generateRandomAlphaNumeric = require("./idGenerator");
const generateCustomerId = () => {
  const timestamp = Date.now();

  const randomStr = generateRandomAlphaNumeric();

  return `CUST-${timestamp}-${randomStr}`;
};
module.exports = generateCustomerId;