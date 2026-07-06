const express = require("express");
const router = express.Router();
const { createFeePayment } = require("../controllers/feePaymentController");

router.post("/", createFeePayment);

module.exports = router;
