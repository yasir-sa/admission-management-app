const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { sendAdminOtpEmail } = require("../utils/adminMailer");

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (admin) =>
  jwt.sign(
    { adminId: admin.adminId, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days, matches token expiry

const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
  });
};

const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("admin_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const errors = {};
    if (!email || !email.trim()) errors.email = "Email is required.";
    if (!password || password.length < 4)
      errors.password = "Password must be at least 4 characters.";
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        errors: { email: "An admin with this email already exists." },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const admin = await Admin.create({
      name: name || null,
      email,
      password: hashedPassword,
      provider: "local",
      otp,
      otpExpires,
      isVerified: false,
    });

    await sendAdminOtpEmail(email, otp);

    res.status(201).json({
      success: true,
      message: `Registered successfully. OTP sent to ${email} for verification.`,
      data: { email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    if (
      !admin.otp ||
      admin.otp !== otp ||
      !admin.otpExpires ||
      new Date() > new Date(admin.otpExpires)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    await admin.update({ isVerified: true, otp: null, otpExpires: null });
    const token = generateToken(admin);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Verified successfully",
      data: { name: admin.name, email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await admin.update({ otp, otpExpires });
    await sendAdminOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin || !admin.password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);
    if (!passwordMatches) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email with the OTP sent during registration first.",
      });
    }

    const token = generateToken(admin);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { name: admin.name, email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

const getMe = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.adminId, {
      attributes: ["adminId", "name", "email", "provider"],
    });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyOtp,
  requestOtp,
  getMe,
};
