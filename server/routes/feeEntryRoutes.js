const express = require("express");
const router = express.Router();
const {
  createFeeEntry,
  getAllFeeEntries,
  updateFeeEntry,
  deleteFeeEntry,
} = require("../controllers/feeEntryController");

router.get("/", getAllFeeEntries);
router.post("/", createFeeEntry);
router.put("/:id", updateFeeEntry);
router.delete("/:id", deleteFeeEntry);

module.exports = router;
