const Dispute = require("../models/dispute.model");
const Alert = require("../models/alert.model");
const Report = require("../models/report.model");
const { generateDisputeId, generateAlertId, generateReportId } = require("../utils/idGenerator");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "admin-repository" });

class DisputeRepository {
  async create(disputeData) {
    const disputeId = disputeData.disputeId || generateDisputeId();
    const dispute = new Dispute({ ...disputeData, disputeId });
    return await dispute.save();
  }

  async findById(disputeId) {
    return await Dispute.findOne({ disputeId });
  }

  async findByTransactionId(transactionId) {
    return await Dispute.findOne({ transactionId });
  }

  async find(filters = {}, options = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.userId) query.userId = filters.userId;
    if (filters.type) query.type = filters.type;

    const sort = options.sort || { createdAt: -1 };
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await Dispute.find(query).sort(sort).skip(skip).limit(limit);
  }

  async updateStatus(disputeId, status, updates = {}) {
    return await Dispute.findOneAndUpdate(
      { disputeId },
      { status, ...updates },
      { returnDocument: "after" }
    );
  }

  async count(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    return await Dispute.countDocuments(query);
  }
}

class AlertRepository {
  async create(alertData) {
    const alertId = alertData.alertId || generateAlertId();
    const alert = new Alert({ ...alertData, alertId });
    return await alert.save();
  }

  async findById(alertId) {
    return await Alert.findOne({ alertId });
  }

  async find(filters = {}, options = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;

    const sort = options.sort || { createdAt: -1 };
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await Alert.find(query).sort(sort).skip(skip).limit(limit);
  }

  async updateStatus(alertId, status, updates = {}) {
    return await Alert.findOneAndUpdate(
      { alertId },
      { status, ...updates },
      { returnDocument: "after" }
    );
  }

  async count(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    return await Alert.countDocuments(query);
  }

  async countBySeverity() {
    const stats = await Alert.aggregate([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);
    const result = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const stat of stats) {
      result[stat._id] = stat.count;
    }
    return result;
  }
}

class ReportRepository {
  async create(reportData) {
    const reportId = reportData.reportId || generateReportId();
    const report = new Report({ ...reportData, reportId });
    return await report.save();
  }

  async findById(reportId) {
    return await Report.findOne({ reportId });
  }

  async find(filters = {}, options = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.generatedBy) query.generatedBy = filters.generatedBy;

    const sort = options.sort || { createdAt: -1 };
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await Report.find(query).sort(sort).skip(skip).limit(limit);
  }

  async updateStatus(reportId, status, updates = {}) {
    return await Report.findOneAndUpdate(
      { reportId },
      { status, ...updates },
      { returnDocument: "after" }
    );
  }
}

module.exports = { DisputeRepository, AlertRepository, ReportRepository };
