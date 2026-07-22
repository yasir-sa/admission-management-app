const express = require("express");
const router = express.Router();
const {
  getSubjectTeachers,
  getSubjectStudents,
  createBatch,
  getAllBatches,
  updateBatch,
  moveBatchSection,
  assignBatchSubstitute,
  removeBatchSubstitute,
  deleteBatch,
} = require("../controllers/batchController");

router.get("/subject-teachers/:subjectId", getSubjectTeachers);
router.get("/subject-students", getSubjectStudents);
router.get("/", getAllBatches);
router.post("/", createBatch);
router.put("/:id", updateBatch);
router.patch("/:id/section", moveBatchSection);
router.put("/:id/substitute", assignBatchSubstitute);
router.delete("/:id/substitute", removeBatchSubstitute);
router.delete("/:id", deleteBatch);

module.exports = router;
