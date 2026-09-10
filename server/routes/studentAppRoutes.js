const express = require("express");
const router = express.Router();
const {
  getStudentBatchesForApp,
  getStudentAttendanceForApp,
  createLeaveRequestFromApp,
  getStudentLeaveRequestsForApp,
} = require("../controllers/leaveRequestController");
const requireStudentAppAuth = require("../middleware/studentAppAuth");

// Every route here is called by the separate Flutter Student App, not by
// this app's own browser client — x-api-key auth, not the admin/teacher
// cookie sessions. See studentAppAuth.js.
router.use(requireStudentAppAuth);

router.get("/batches", getStudentBatchesForApp);
router.get("/attendance", getStudentAttendanceForApp);
router.get("/leave-requests", getStudentLeaveRequestsForApp);
router.post("/leave-requests", createLeaveRequestFromApp);

module.exports = router;
