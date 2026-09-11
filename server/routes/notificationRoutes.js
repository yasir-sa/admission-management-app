const express = require("express");
const router = express.Router();
const {
  sendNotification,
  getSentNotifications,
  saveSchedule,
} = require("../controllers/notificationController");

router.get("/", getSentNotifications);
router.post("/send", sendNotification);
router.put("/schedule", saveSchedule);

module.exports = router;
