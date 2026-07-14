const WeeklySchedule = require("../models/WeeklySchedule");
const WeeklyScheduleSlot = require("../models/WeeklyScheduleSlot");
const Group = require("../models/Group");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");

const includeOptions = [
  {
    model: WeeklyScheduleSlot,
    as: "Slots",
    include: [
      {
        model: Group,
        include: [{ model: Teacher }, { model: Course }],
      },
    ],
  },
];

const createSchedule = async (req, res) => {
  try {
    const { schedule_name } = req.body;
    if (!schedule_name || !schedule_name.trim()) {
      return res.status(400).json({
        success: false,
        errors: { schedule_name: "Schedule Name is required." },
      });
    }
    const schedule = await WeeklySchedule.create({ schedule_name });
    res.status(201).json({
      success: true,
      message: "Weekly schedule added successfully",
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllSchedules = async (req, res) => {
  try {
    const isActive = req.query.active !== "false";
    const schedules = await WeeklySchedule.findAll({
      where: { active: isActive },
      include: includeOptions,
      order: [["id", "ASC"]],
    });
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await WeeklySchedule.findByPk(id);
    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Weekly schedule not found" });
    }
    await schedule.update({ active: false });
    res.status(200).json({
      success: true,
      message: "Weekly schedule removed successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_on } = req.body;
    const schedule = await WeeklySchedule.findByPk(id);
    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Weekly schedule not found" });
    }

    if (is_on) {
      await WeeklySchedule.update(
        { is_on: false },
        { where: { active: true } }
      );
    }
    await schedule.update({ is_on: !!is_on });

    res.status(200).json({
      success: true,
      message: is_on
        ? "Schedule turned ON — this is now the running schedule"
        : "Schedule turned OFF",
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSlot = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { day_of_week, group_id, timing } = req.body;
    const errors = {};
    if (!day_of_week) errors.day_of_week = "Day of Week is required.";
    if (!group_id) errors.group_id = "Group is required.";
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const schedule = await WeeklySchedule.findByPk(scheduleId);
    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Weekly schedule not found" });
    }

    const slot = await WeeklyScheduleSlot.create({
      weekly_schedule_id: scheduleId,
      day_of_week,
      group_id,
      timing: timing || null,
    });
    res.status(201).json({
      success: true,
      message: "Slot added successfully",
      data: slot,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await WeeklyScheduleSlot.findByPk(id);
    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Slot not found" });
    }
    await slot.destroy();
    res
      .status(200)
      .json({ success: true, message: "Slot removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSchedule,
  getAllSchedules,
  deleteSchedule,
  toggleSchedule,
  createSlot,
  deleteSlot,
};
