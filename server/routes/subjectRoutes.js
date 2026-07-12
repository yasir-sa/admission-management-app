const express = require("express");
const router = express.Router();
const {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
  createSubSubject,
  updateSubSubject,
  deleteSubSubject,
} = require("../controllers/subjectController");

router.get("/", getAllSubjects);
router.post("/", createSubject);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);
router.put("/:id/restore", restoreSubject);

router.post("/:subjectId/sub-subjects", createSubSubject);
router.put("/sub-subjects/:id", updateSubSubject);
router.delete("/sub-subjects/:id", deleteSubSubject);

module.exports = router;
