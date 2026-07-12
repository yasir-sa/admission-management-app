const express = require("express");
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  updateCourse,
  deleteCourse,
  restoreCourse,
  setCourseSubjects,
} = require("../controllers/courseController");

router.get("/", getAllCourses);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);
router.put("/:id/restore", restoreCourse);
router.put("/:id/subjects", setCourseSubjects);

module.exports = router;
