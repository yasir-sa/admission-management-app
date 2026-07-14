const express = require("express");
const router = express.Router();
const {
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  setTeacherCourses,
} = require("../controllers/teacherController");

router.get("/", getAllTeachers);
router.post("/", createTeacher);
router.put("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);
router.put("/:id/restore", restoreTeacher);
router.put("/:id/courses", setTeacherCourses);

module.exports = router;
