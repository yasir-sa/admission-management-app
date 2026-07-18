const jwt = require("jsonwebtoken");

const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
  const token = req.cookies?.admin_token || bearerToken;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated. Please log in." });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
};

module.exports = requireAdminAuth;
