const accountService = require("../services/account.services");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "account-controller" });

const createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: email, password, firstName, lastName",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    const user = await accountService.createUser({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const authenticateUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: email, password",
      });
    }

    const result = await accountService.authenticateUser(email, password);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await accountService.getUser(userId);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, phone } = req.body;

    const user = await accountService.updateUser(userId, {
      firstName,
      lastName,
      phone,
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const createWallet = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: currency",
      });
    }

    if (currency.length !== 3) {
      return res.status(400).json({
        success: false,
        error: "Currency must be a 3-letter ISO code",
      });
    }

    const wallet = await accountService.createWallet(userId, currency);

    return res.status(201).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

const getWallets = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const wallets = await accountService.getWallets(userId);

    return res.status(200).json({
      success: true,
      data: wallets,
    });
  } catch (error) {
    next(error);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { currency } = req.query;

    if (!currency) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameter: currency",
      });
    }

    const balance = await accountService.getBalance(userId, currency);

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};

const validateWallets = async (req, res, next) => {
  try {
    const { walletIds } = req.body;

    if (!walletIds || !Array.isArray(walletIds) || walletIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: walletIds (array)",
      });
    }

    const result = await accountService.validateWallets(walletIds);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const freezeAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await accountService.freezeAccount(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const unfreezeAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await accountService.unfreezeAccount(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const submitKyc = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { documentType, documentNumber, documentFrontUrl, documentBackUrl } = req.body;

    if (!documentType || !documentNumber || !documentFrontUrl) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: documentType, documentNumber, documentFrontUrl",
      });
    }

    const result = await accountService.submitKyc(
      userId,
      documentType,
      documentNumber,
      documentFrontUrl,
      documentBackUrl
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getKycStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await accountService.getKycStatus(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  authenticateUser,
  getUser,
  updateUser,
  createWallet,
  getWallets,
  getBalance,
  validateWallets,
  freezeAccount,
  unfreezeAccount,
  submitKyc,
  getKycStatus,
};
