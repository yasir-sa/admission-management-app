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
      attributes: ["adminId", "name", "email", "provider", "picture", "password"],
    });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }
    res.status(200).json({
      success: true,
      data: {
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        provider: admin.provider,
        picture: admin.picture,
        hasPassword: !!admin.password,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const setPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({
        success: false,
        errors: { password: "Password must be at least 4 characters." },
      });
    }
    const admin = await Admin.findByPk(req.admin.adminId);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await admin.update({ password: hashedPassword });
    res.status(200).json({
      success: true,
      message: "Password set successfully. You can now log in with email and password too.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Step 1: send the browser to Google's account chooser / consent screen.
const googleAuthRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "online",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// Step 2: Google redirects back here with a one-time code. Exchange it for
// the user's email/name/picture, find-or-create the Admin, log them in, and
// hand the browser back to the frontend.
const googleAuthCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL;
  try {
    const { code, error: googleError } = req.query;
    if (googleError || !code) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const googleUser = await userRes.json();
    if (!userRes.ok || !googleUser.email) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const { email, name, picture } = googleUser;

    let admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      admin = await Admin.create({
        name: name || null,
        email,
        password: null,
        provider: "google",
        picture: picture || null,
        isVerified: true,
      });
    } else {
      // A successful Google sign-in outranks the OTP/local flow — once an
      // admin proves their inbox via Google, treat "google" as their
      // provider going forward, even if they originally registered via OTP.
      await admin.update({
        isVerified: true,
        provider: "google",
        picture: picture || admin.picture,
      });
    }

    const token = generateToken(admin);
    setAuthCookie(res, token);

    res.redirect(frontendUrl);
  } catch (error) {
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyOtp,
  requestOtp,
  getMe,
  setPassword,
  googleAuthRedirect,
  googleAuthCallback,
};
