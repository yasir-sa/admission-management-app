const { Op } = require("sequelize");
const Holiday = require("../models/Holiday");

const getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({ order: [["date", "DESC"]] });
    res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createHoliday = async (req, res) => {
  try {
    const { date, description } = req.body;
    if (!date) {
      return res.status(400).json({
        success: false,
        errors: { date: "Date is required." },
      });
    }
    const existing = await Holiday.findOne({ where: { date } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This date is already marked as a holiday.",
      });
    }
    const holiday = await Holiday.create({
      date,
      description: description || null,
    });
    res.status(201).json({
      success: true,
      message: "Holiday added successfully",
      data: holiday,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res
        .status(404)
        .json({ success: false, message: "Holiday not found" });
    }
    await holiday.destroy();
    res
      .status(200)
      .json({ success: true, message: "Holiday removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayHoliday = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const holiday = await Holiday.findOne({ where: { date: today } });
    res.status(200).json({ success: true, data: holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUpcomingHolidays = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const holidays = await Holiday.findAll({
      where: { date: { [Op.gt]: today } },
      order: [["date", "ASC"]],
      limit: 5,
    });
    res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllHolidays,
  createHoliday,
  deleteHoliday,
  getTodayHoliday,
  getUpcomingHolidays,
};
