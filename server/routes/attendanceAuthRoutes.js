const express = require("express");
const router = express.Router();
const {
  lookupBySlug,
  requestOtp,
  verifyOtp,
} = require("../controllers/attendanceAuthController");

router.get("/lookup/:slug", lookupBySlug);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
