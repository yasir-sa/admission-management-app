const Attendance = require("../models/Attendance");
const Admission = require("../models/Admission");

const markAttendanceForAdmission = async (admission) => {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await Attendance.findOne({
    where: { admission_id: admission.id, date: today },
  });
  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        message: `${admission.applicant_name} is already marked present today`,
      },
    };
  }

  const attendance = await Attendance.create({
    admission_id: admission.id,
    date: today,
  });

  return {
    status: 201,
    body: {
      success: true,
      message: `Attendance marked for ${admission.applicant_name}`,
      data: attendance,
    },
  };
};

const markAttendance = async (req, res) => {
  try {
    const { admission_id } = req.body;
    const admission = await Admission.findByPk(admission_id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    const result = await markAttendanceForAdmission(admission);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const scanAttendance = async (req, res) => {
  try {
    const { slug } = req.params;
    const admission = await Admission.findOne({
      where: { slug, active: true, is_verified: true },
    });
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "QR not recognized or student not verified",
      });
    }

    const result = await markAttendanceForAdmission(admission);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findAll({
      include: [{ model: Admission, attributes: ["applicant_name"] }],
      order: [["date", "DESC"]],
    });
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAttendanceByAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const attendance = await Attendance.findAll({
      where: { admission_id: admissionId },
      order: [["date", "DESC"]],
    });
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByAdmission,
  scanAttendance,
};
