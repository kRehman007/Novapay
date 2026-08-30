const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const generateId = (prefix) => {
  const uuid = uuidv4().replace(/-/g, "");
  return `${prefix}_${uuid}`;
};

const generateTransactionId = () => generateId("txn");
const generateIdempotencyKeyId = () => generateId("iky");
const generateRequestId = () => generateId("req");

const hashPayload = (payload) => {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(sorted).digest("hex");
};

module.exports = {
  generateId,
  generateTransactionId,
  generateIdempotencyKeyId,
  generateRequestId,
  hashPayload,
};
