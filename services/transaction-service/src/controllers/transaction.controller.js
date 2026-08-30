const transactionService = require("../services/transaction.services");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "transaction-controller" });

const createTransfer = async (req, res, next) => {
  try {
    const { senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, description, metadata, idempotencyKey } = req.body;

    if (!senderWalletId || !senderUserId || !receiverWalletId || !receiverUserId || !amountMinor || !currency || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, idempotencyKey",
      });
    }

    if (amountMinor < 1) {
      return res.status(400).json({
        success: false,
        error: "amountMinor must be at least 1",
      });
    }

    const result = await transactionService.createTransfer(
      { senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, description, metadata },
      idempotencyKey
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createFxTransfer = async (req, res, next) => {
  try {
    const { senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, fxQuoteId, description, metadata, idempotencyKey } = req.body;

    if (!senderWalletId || !senderUserId || !receiverWalletId || !receiverUserId || !amountMinor || !currency || !fxQuoteId || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, fxQuoteId, idempotencyKey",
      });
    }

    const result = await transactionService.createFxTransfer(
      { senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, description, metadata },
      idempotencyKey,
      fxQuoteId
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await transactionService.getTransaction(id);

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

const getUserTransactions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const result = await transactionService.getUserTransactions(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const reverseTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await transactionService.reverseTransaction(id, reason);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPendingTransactions = async (req, res, next) => {
  try {
    const transactions = await transactionService.getPendingTransactions();

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

const recoverTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await transactionService.recoverTransaction(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const runRecovery = async (req, res, next) => {
  try {
    const result = await transactionService.runRecovery();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransfer,
  createFxTransfer,
  getTransaction,
  getUserTransactions,
  reverseTransaction,
  getPendingTransactions,
  recoverTransaction,
  runRecovery,
};
