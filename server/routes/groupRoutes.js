const express = require("express");
const router = express.Router();
const {
  createGroup,
  getAllGroups,
  updateGroup,
  deleteGroup,
  restoreGroup,
  setGroupStudents,
} = require("../controllers/groupController");

router.get("/", getAllGroups);
router.post("/", createGroup);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);
router.put("/:id/restore", restoreGroup);
router.put("/:id/students", setGroupStudents);

module.exports = router;
