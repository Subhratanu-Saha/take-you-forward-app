// utils/randomAlphaNumericGenerator.js

function generateRandomAlphaNumeric(length = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }

    return result;
}

module.exports = generateRandomAlphaNumeric;