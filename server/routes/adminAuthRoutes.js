const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  verifyOtp,
  requestOtp,
  getMe,
  setPassword,
  googleAuthRedirect,
  googleAuthCallback,
} = require("../controllers/adminAuthController");
const requireAdminAuth = require("../middleware/adminAuth");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOtp);
router.post("/request-otp", requestOtp);
router.get("/me", requireAdminAuth, getMe);
router.post("/set-password", requireAdminAuth, setPassword);
router.get("/google", googleAuthRedirect);
router.get("/google/callback", googleAuthCallback);

module.exports = router;
