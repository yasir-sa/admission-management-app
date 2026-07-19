const jwt = require("jsonwebtoken");

const requireTeacherAuth = (req, res, next) => {
  const token = req.cookies?.teacher_token;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "teacher") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid session." });
    }
    req.teacher = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
};

module.exports = requireTeacherAuth;
