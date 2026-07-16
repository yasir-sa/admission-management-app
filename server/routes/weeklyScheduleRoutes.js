const express = require("express");
const router = express.Router();
const {
  createSchedule,
  getAllSchedules,
  deleteSchedule,
  toggleSchedule,
  createSlot,
  deleteSlot,
  setSlotSubstitute,
  removeSlotSubstitute,
} = require("../controllers/weeklyScheduleController");

router.get("/", getAllSchedules);
router.post("/", createSchedule);
router.delete("/:id", deleteSchedule);
router.put("/:id/toggle", toggleSchedule);

router.post("/:scheduleId/slots", createSlot);
router.delete("/slots/:id", deleteSlot);
router.put("/slots/:id/substitute", setSlotSubstitute);
router.delete("/slots/:id/substitute", removeSlotSubstitute);

module.exports = router;
