const Admission = require("../models/Admission");
const Teacher = require("../models/Teacher");
const StudentEntryAttendance = require("../models/StudentEntryAttendance");
const TeacherEntryAttendance = require("../models/TeacherEntryAttendance");

// One shared QR scanner for both students and teachers — the slug is looked
// up against Admission first, then Teacher, and the matching person's entry
// is logged. This is independent of the class-schedule Attendance system;
// it's just "what time did this person walk in today".
const scanEntry = async (req, res) => {
  try {
    const { slug } = req.params;
    const adminId = req.admin.adminId;
    const today = new Date().toISOString().slice(0, 10);

    const admission = await Admission.findOne({
      where: { slug, active: true, admin_id: adminId },
    });
    if (admission) {
      const entry = await StudentEntryAttendance.create({
        admission_id: admission.id,
        admin_id: adminId,
        date: today,
      });
      return res.status(201).json({
        success: true,
        message: `Entry marked for ${admission.applicant_name}`,
        data: entry,
      });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, admin_id: adminId },
    });
    if (teacher) {
      const entry = await TeacherEntryAttendance.create({
        teacher_id: teacher.id,
        admin_id: adminId,
        date: today,
      });
      return res.status(201).json({
        success: true,
        message: `Entry marked for ${teacher.teacher_name}`,
        data: entry,
      });
    }

    res.status(404).json({
      success: false,
      message: "QR not recognized or not verified",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStudentEntryAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const where = { admin_id: req.admin.adminId };
    if (date) where.date = date;

    const entries = await StudentEntryAttendance.findAll({
      where,
      include: [{ model: Admission, attributes: ["applicant_name", "comn_enrol_no"] }],
      order: [["marked_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: entries.map((e) => ({
        id: e.id,
        name: e.Admission?.applicant_name || "-",
        enrol_no: e.Admission?.comn_enrol_no || null,
        date: e.date,
        marked_at: e.marked_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTeacherEntryAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const where = { admin_id: req.admin.adminId };
    if (date) where.date = date;

    const entries = await TeacherEntryAttendance.findAll({
      where,
      include: [{ model: Teacher, attributes: ["teacher_name"] }],
      order: [["marked_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: entries.map((e) => ({
        id: e.id,
        name: e.Teacher?.teacher_name || "-",
        date: e.date,
        marked_at: e.marked_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  scanEntry,
  getStudentEntryAttendance,
  getTeacherEntryAttendance,
};
