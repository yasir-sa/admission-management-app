const FeeEntry = require("../models/FeeEntry");

const createFeeEntry = async (req, res) => {
  try {
    const { bill_no, enrol_no, amount, paid_date, payment_mode, description } =
      req.body;
    const entry = await FeeEntry.create({
      bill_no,
      enrol_no,
      amount,
      paid_date,
      payment_mode,
      description: description || null,
      admin_id: req.admin?.adminId || null,
    });
    res.status(201).json({
      success: true,
      message: "Fee entry saved successfully",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllFeeEntries = async (req, res) => {
  try {
    const entries = await FeeEntry.findAll({
      where: { admin_id: req.admin.adminId },
      order: [["id", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateFeeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { bill_no, enrol_no, amount, paid_date, payment_mode, description } =
      req.body;
    const entry = await FeeEntry.findOne({
      where: { id, admin_id: req.admin.adminId },
    });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Fee entry not found",
      });
    }
    await entry.update({
      bill_no,
      enrol_no,
      amount,
      paid_date,
      payment_mode,
      description: description || null,
    });
    res.status(200).json({
      success: true,
      message: "Fee entry updated successfully",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteFeeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await FeeEntry.findOne({
      where: { id, admin_id: req.admin.adminId },
    });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Fee entry not found",
      });
    }
    await entry.destroy();
    res.status(200).json({
      success: true,
      message: "Fee entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFeeEntry,
  getAllFeeEntries,
  updateFeeEntry,
  deleteFeeEntry,
};
