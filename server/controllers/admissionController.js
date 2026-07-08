const Admission = require("../models/Admission");
const FeePayment = require("../models/FeePayment");
const InformationSheet = require("../models/InformationSheet");

const NULLABLE_IF_EMPTY_FIELDS = [
  "aadhar_no",
  "age",
  "date_of_birth",
  "total_fee",
  "first_installment_amount",
];

const sanitizePayload = (body) => {
  const payload = { ...body };
  NULLABLE_IF_EMPTY_FIELDS.forEach((field) => {
    if (payload[field] === "" || payload[field] === undefined) {
      payload[field] = null;
    }
  });
  return payload;
};

const createAdmission = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);

    if (payload.aadhar_no) {
      const existing = await Admission.findOne({
        where: { aadhar_no: payload.aadhar_no },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          field: "aadhar_no",
          message: "This Aadhar number is already registered.",
        });
      }
    }

    const admission = await Admission.create(payload);
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
    const isActive = req.query.active !== "false";
    const admissions = await Admission.findAll({
      where: { active: isActive },
      include: [{ model: FeePayment }, { model: InformationSheet }],
      order: [["id", "ASC"]],
    });
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
      include: [{ model: FeePayment }, { model: InformationSheet }],
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
    const payload = sanitizePayload(req.body);
    await admission.update(payload);
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
    await admission.update({ active: false });
    res.status(200).json({
      success: true,
      message: "Admission marked as inactive successfully",
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
