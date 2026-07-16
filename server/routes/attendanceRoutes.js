const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAllAttendance,
  getAttendanceByAdmission,
  scanAttendance,
  getTeacherAttendance,
} = require("../controllers/attendanceController");

router.get("/", getAllAttendance);
router.post("/", markAttendance);
router.post("/scan/:slug", scanAttendance);
router.get("/teachers", getTeacherAttendance);
router.get("/admission/:admissionId", getAttendanceByAdmission);

module.exports = router;
