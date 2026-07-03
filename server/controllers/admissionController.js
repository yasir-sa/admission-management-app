const Admission = require("../models/Admission");
const FeePayment = require("../models/FeePayment");

const createAdmission = async (req, res) => {
  try {
    const existing = await Admission.findOne({
      where: { aadhar_no: req.body.aadhar_no },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        field: "aadhar_no",
        message: "This Aadhar number is already registered.",
      });
    }

    const admission = await Admission.create(req.body);
    res.status(201).json({
      success: true,
      message: "Admission submitted successfully",
      data: admission,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        field: "aadhar_no",
        message: "This Aadhar number is already registered.",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllAdmissions = async (req, res) => {
  try {
    const admissions = await Admission.findAll({ order: [["id", "ASC"]] });
    res.status(200).json({
      success: true,
      data: admissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const admission = await Admission.findByPk(id, {
      include: [{ model: FeePayment }],
    });
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }
    res.status(200).json({
      success: true,
      data: admission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const admission = await Admission.findByPk(id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }
    await admission.update(req.body);
    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: admission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const admission = await Admission.findByPk(id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }
    await admission.destroy();
    res.status(200).json({
      success: true,
      message: "Admission deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createAdmission,
  getAllAdmissions,
  getAdmissionById,
  updateAdmission,
  deleteAdmission,
};
