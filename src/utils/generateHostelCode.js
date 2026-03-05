const { v4: uuidv4 } = require('uuid');

const generateHostelCode = (hostelName) => {
  const prefix = hostelName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  const uniquePart = uuidv4().substring(0, 6).toUpperCase();
  return `PG-${prefix}-${uniquePart}`;
};

module.exports = generateHostelCode;
