const express = require("express");
const router = express.Router();
const {
  lookupBySlug,
  requestOtp,
  verifyOtp,
  getDashboard,
  markAttendance,
} = require("../controllers/teacherAuthController");

router.get("/lookup/:slug", lookupBySlug);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.get("/dashboard/:slug", getDashboard);
router.post("/mark-attendance", markAttendance);

module.exports = router;
