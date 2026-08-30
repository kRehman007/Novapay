const { v4: uuidv4 } = require("uuid");

const generateId = (prefix) => {
  const uuid = uuidv4().replace(/-/g, "");
  return `${prefix}_${uuid}`;
};

const generateUserId = () => generateId("usr");
const generateWalletId = () => generateId("wal");
const generateKycId = () => generateId("kyc");
const generateRequestId = () => generateId("req");

module.exports = {
  generateId,
  generateUserId,
  generateWalletId,
  generateKycId,
  generateRequestId,
};
