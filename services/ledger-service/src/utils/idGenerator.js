const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const generateId = (prefix) => {
  const uuid = uuidv4().replace(/-/g, "");
  return `${prefix}_${uuid}`;
};

const generateLedgerAccountId = () => generateId("lac");
const generateLedgerEntryId = () => generateId("len");
const generateLedgerTransactionId = () => generateId("ltx");
const generateAuditLogId = () => generateId("aud");

const hashPayload = (payload) => {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(sorted).digest("hex");
};

const computeChainHash = (previousHash, data) => {
  const content = `${previousHash || ""}${JSON.stringify(data)}`;
  return crypto.createHash("sha256").update(content).digest("hex");
};

module.exports = {
  generateId,
  generateLedgerAccountId,
  generateLedgerEntryId,
  generateLedgerTransactionId,
  generateAuditLogId,
  hashPayload,
  computeChainHash,
};
