const express = require("express");
const router = express.Router();
const {
  createSchedule,
  getAllSchedules,
  deleteSchedule,
  toggleSchedule,
  createSlot,
  deleteSlot,
} = require("../controllers/weeklyScheduleController");

router.get("/", getAllSchedules);
router.post("/", createSchedule);
router.delete("/:id", deleteSchedule);
router.put("/:id/toggle", toggleSchedule);

router.post("/:scheduleId/slots", createSlot);
router.delete("/slots/:id", deleteSlot);

module.exports = router;
