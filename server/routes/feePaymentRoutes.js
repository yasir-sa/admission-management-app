const express = require("express");
const router = express.Router();
const {
  createFeePayment,
  updateFeePayment,
  deleteFeePayment,
} = require("../controllers/feePaymentController");

router.post("/", createFeePayment);
router.put("/:id", updateFeePayment);
router.delete("/:id", deleteFeePayment);

module.exports = router;
