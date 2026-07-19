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
  loginRequestOtp,
  loginVerifyOtp,
  teacherLogout,
  getTeacherMe,
} = require("../controllers/teacherAuthController");
const requireTeacherAuth = require("../middleware/teacherAuth");

router.get("/lookup/:slug", lookupBySlug);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.get("/dashboard/:slug", getDashboard);
router.post("/mark-attendance", markAttendance);
router.post("/mark-unavailable", markUnavailableToday);
router.post("/mark-available", markAvailableToday);
router.post("/start-class", startClass);
router.post("/end-class", endClass);

// General Teacher Login (email + OTP, cookie session — separate from the
// personal slug-link flow above)
router.post("/login-request-otp", loginRequestOtp);
router.post("/login-verify-otp", loginVerifyOtp);
router.post("/logout", teacherLogout);
router.get("/me", requireTeacherAuth, getTeacherMe);

module.exports = router;
