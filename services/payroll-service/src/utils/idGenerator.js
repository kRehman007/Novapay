const { v4: uuidv4 } = require("uuid");

const generateId = (prefix) => {
  const uuid = uuidv4().replace(/-/g, "");
  return `${prefix}_${uuid}`;
};

const generateBatchId = () => generateId("bat");
const generateItemId = () => generateId("pay");
const generateIdempotencyKeyId = () => generateId("iky");

module.exports = { generateId, generateBatchId, generateItemId, generateIdempotencyKeyId };
