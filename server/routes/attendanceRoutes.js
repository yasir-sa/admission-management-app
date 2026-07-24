const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAllAttendance,
  getAttendanceByAdmission,
  scanAttendance,
  getBatchWiseAttendance,
} = require("../controllers/attendanceController");

router.get("/batch-wise", getBatchWiseAttendance);
router.get("/", getAllAttendance);
router.post("/", markAttendance);
router.post("/scan/:slug", scanAttendance);
router.get("/admission/:admissionId", getAttendanceByAdmission);

module.exports = router;
