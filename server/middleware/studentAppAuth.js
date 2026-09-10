// Gate for the handful of endpoints the separate Flutter Student App calls
// into this server (attendance history, batch list, leave requests) —
// mirrors the x-api-key convention that app's own attendance-summary API
// already uses on its side (see client/src/utils/studentAppSync.js).
const requireStudentAppAuth = (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.STUDENT_APP_INBOUND_API_KEY) {
    return res.status(401).json({ success: false, message: "Invalid or missing API key." });
  }
  next();
};

module.exports = requireStudentAppAuth;
