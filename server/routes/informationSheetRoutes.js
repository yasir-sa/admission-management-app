const express = require("express");
const router = express.Router();
const {
  createInformationSheet,
  updateInformationSheet,
} = require("../controllers/informationSheetController");

router.post("/", createInformationSheet);
router.put("/:id", updateInformationSheet);

module.exports = router;
