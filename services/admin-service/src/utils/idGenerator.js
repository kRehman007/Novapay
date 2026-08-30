const { v4: uuidv4 } = require("uuid");

const generateId = (prefix) => {
  const uuid = uuidv4().replace(/-/g, "");
  return `${prefix}_${uuid}`;
};

const generateDisputeId = () => generateId("dsp");
const generateAlertId = () => generateId("alt");
const generateReportId = () => generateId("rpt");

module.exports = { generateId, generateDisputeId, generateAlertId, generateReportId };
