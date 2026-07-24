const express = require("express");
const router = express.Router();
const {
  lookupBySlug,
  requestOtp,
  verifyOtp,
  getDashboard,
  markAttendance,
  markBatchAttendance,
  markUnavailableToday,
  markAvailableToday,
  startClass,
  endClass,
  startBatch,
  endBatch,
  getBatchProgress,
  markSubjectComplete,
  unmarkSubjectComplete,
  getBatchTopicSuggestions,
  cancelBatch,
  loginRequestOtp,
  loginVerifyOtp,
  teacherLogout,
  getTeacherMe,
} = require("../controllers/teacherAuthController");
const requireTeacherAuth = require("../middleware/teacherAuth");

// Public: only identity-lookup and OTP request/verify need no session yet.
router.get("/lookup/:slug", lookupBySlug);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

// Everything below reveals a teacher's data or performs an action on their
// behalf — these used to trust "is_verified" as a permanent DB flag, which
// meant anyone who ever got hold of a teacher's slug link could use it
// forever without OTP. Now they require the session cookie verify-otp
// issues, and the controller cross-checks it against the slug's owner.
router.get("/dashboard/:slug", requireTeacherAuth, getDashboard);
router.post("/mark-attendance", requireTeacherAuth, markAttendance);
router.post("/mark-batch-attendance", requireTeacherAuth, markBatchAttendance);
router.post("/mark-unavailable", requireTeacherAuth, markUnavailableToday);
router.post("/mark-available", requireTeacherAuth, markAvailableToday);
router.post("/start-class", requireTeacherAuth, startClass);
router.post("/end-class", requireTeacherAuth, endClass);
router.post("/start-batch", requireTeacherAuth, startBatch);
router.post("/end-batch", requireTeacherAuth, endBatch);
router.get("/batch-progress/:slug", requireTeacherAuth, getBatchProgress);
router.post("/mark-subject-complete", requireTeacherAuth, markSubjectComplete);
router.post("/unmark-subject-complete", requireTeacherAuth, unmarkSubjectComplete);
router.get("/batch-topics/:batchId", requireTeacherAuth, getBatchTopicSuggestions);
router.post("/cancel-batch", requireTeacherAuth, cancelBatch);

// General Teacher Login (email + OTP, cookie session — separate from the
// personal slug-link flow above)
router.post("/login-request-otp", loginRequestOtp);
router.post("/login-verify-otp", loginVerifyOtp);
router.post("/logout", teacherLogout);
router.get("/me", requireTeacherAuth, getTeacherMe);

module.exports = router;
