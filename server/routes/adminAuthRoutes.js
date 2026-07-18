const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  verifyOtp,
  requestOtp,
  getMe,
} = require("../controllers/adminAuthController");
const requireAdminAuth = require("../middleware/adminAuth");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOtp);
router.post("/request-otp", requestOtp);
router.get("/me", requireAdminAuth, getMe);

module.exports = router;
