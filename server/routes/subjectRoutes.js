const express = require("express");
const router = express.Router();
const {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
} = require("../controllers/subjectController");

router.get("/", getAllSubjects);
router.post("/", createSubject);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);
router.put("/:id/restore", restoreSubject);

module.exports = router;
