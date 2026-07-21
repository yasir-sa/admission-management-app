const express = require("express");
const router = express.Router();
const {
  scanEntry,
  getStudentEntryAttendance,
  getTeacherEntryAttendance,
} = require("../controllers/entryAttendanceController");

router.post("/scan/:slug", scanEntry);
router.get("/students", getStudentEntryAttendance);
router.get("/teachers", getTeacherEntryAttendance);

module.exports = router;
