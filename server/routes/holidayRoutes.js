const express = require("express");
const router = express.Router();
const {
  getAllHolidays,
  createHoliday,
  deleteHoliday,
  getTodayHoliday,
} = require("../controllers/holidayController");

router.get("/", getAllHolidays);
router.get("/today", getTodayHoliday);
router.post("/", createHoliday);
router.delete("/:id", deleteHoliday);

module.exports = router;
