const express = require("express");
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  updateCourse,
  deleteCourse,
  restoreCourse,
} = require("../controllers/courseController");

router.get("/", getAllCourses);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);
router.put("/:id/restore", restoreCourse);

module.exports = router;
