const express = require("express");
const router = express.Router();
const {
  lookupBySlug,
  requestOtp,
  verifyOtp,
  getDashboard,
  markAttendance,
  markUnavailableToday,
  markAvailableToday,
  startClass,
  endClass,
} = require("../controllers/teacherAuthController");

router.get("/lookup/:slug", lookupBySlug);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.get("/dashboard/:slug", getDashboard);
router.post("/mark-attendance", markAttendance);
router.post("/mark-unavailable", markUnavailableToday);
router.post("/mark-available", markAvailableToday);
router.post("/start-class", startClass);
router.post("/end-class", endClass);

module.exports = router;
