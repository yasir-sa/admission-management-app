const express = require("express");
const router = express.Router();
const {
  getAllHolidays,
  createHoliday,
  deleteHoliday,
  getTodayHoliday,
  getUpcomingHolidays,
} = require("../controllers/holidayController");

router.get("/", getAllHolidays);
router.get("/today", getTodayHoliday);
router.get("/upcoming", getUpcomingHolidays);
router.post("/", createHoliday);
router.delete("/:id", deleteHoliday);

module.exports = router;
