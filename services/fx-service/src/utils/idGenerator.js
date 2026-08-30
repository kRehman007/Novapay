const { v4: uuidv4 } = require("uuid");

const generateId = (prefix) => {
  const uuid = uuidv4().replace(/-/g, "");
  return `${prefix}_${uuid}`;
};

const generateQuoteId = () => generateId("fxq");
const generateRateId = () => generateId("fxr");

module.exports = { generateId, generateQuoteId, generateRateId };
