const express = require("express");
const { proxyRequest } = require("../services/gateway.service");

const router = express.Router();

router.all("*", proxyRequest);

module.exports = router;
