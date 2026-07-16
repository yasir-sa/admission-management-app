const express = require("express");
const router = express.Router();
const { getTodayStatus } = require("../controllers/teacherAvailabilityController");

router.get("/today", getTodayStatus);

module.exports = router;
