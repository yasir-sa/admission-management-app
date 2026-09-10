const LeaveRequest = require("../models/LeaveRequest");
const Batch = require("../models/Batch");
const Admission = require("../models/Admission");
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");
const BatchSession = require("../models/BatchSession");
const Attendance = require("../models/Attendance");
const { SECTION_LABELS } = require("../utils/sections");

const VALID_LEAVE_TYPES = ["advance", "retroactive"];
const VALID_REVIEW_STATUSES = ["accepted", "rejected"];

// ============================================================
// Teacher-side (cookie auth, req.teacher) — TeacherRegister.jsx's
// dedicated Leave Requests page.
// ============================================================

// Lists leave requests for whatever batches this teacher CURRENTLY owns —
// recomputed live every call, never from a stored teacher_id on the leave
// request itself. This is what makes a Batch Transfer silently redirect a
// pending request to the new teacher with no extra code anywhere.
const getTeacherLeaveRequests = async (req, res) => {
  try {
    const myBatches = await Batch.findAll({
      where: { teacher_id: req.teacher.teacherId, admin_id: req.teacher.admin_id, active: true },
      include: [{ model: Subject, attributes: ["subject_name"] }],
    });
    const batchById = new Map(myBatches.map((b) => [b.id, b]));
    const batchIds = myBatches.map((b) => b.id);

    const requests = batchIds.length
      ? await LeaveRequest.findAll({
          where: { batch_id: batchIds },
          order: [["requested_at", "DESC"]],
        })
      : [];

    const admissionIds = [...new Set(requests.map((r) => r.admission_id))];
    const admissions = admissionIds.length
      ? await Admission.findAll({
          where: { id: admissionIds },
          attributes: ["id", "applicant_name", "comn_enrol_no"],
        })
      : [];
    const admissionById = new Map(admissions.map((a) => [a.id, a]));

    const data = requests.map((r) => {
      const batch = batchById.get(r.batch_id);
      const admission = admissionById.get(r.admission_id);
      return {
        id: r.id,
        batch_id: r.batch_id,
        batch_name: batch?.batch_name || null,
        subject_name: batch?.Subject?.subject_name || null,
        student_name: admission?.applicant_name || null,
        comn_enrol_no: admission?.comn_enrol_no || null,
        session_date: r.session_date,
        description: r.description,
        leave_type: r.leave_type,
        status: r.status,
        requested_at: r.requested_at,
        reviewed_at: r.reviewed_at,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reviewLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "status must be accepted or rejected." });
    }

    const leaveRequest = await LeaveRequest.findOne({
      where: { id, admin_id: req.teacher.admin_id },
    });
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: "Leave request not found." });
    }

    // Ownership is re-checked live against the batch's CURRENT teacher —
    // if the batch was transferred away since this request was submitted,
    // only the new teacher can act on it.
    const batch = await Batch.findOne({ where: { id: leaveRequest.batch_id } });
    if (!batch || batch.teacher_id !== req.teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: "This request isn't assigned to you — the batch may have been transferred.",
      });
    }

    await leaveRequest.update({
      status,
      reviewed_by_teacher_id: req.teacher.teacherId,
      reviewed_at: new Date(),
    });

    res.status(200).json({ success: true, message: `Leave request ${status}.`, data: leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// Flutter Student App-facing (x-api-key auth, requireStudentAppAuth)
// ============================================================

// comn_enrol_no is treated as a unique student identifier throughout this
// app's Student App integrations (see studentAppSync.js) — looked up
// without an admin_id filter, same as every other comn_enrol_no lookup
// added for this app this session.
const findAdmissionByEnrolNo = (comnEnrolNo) =>
  Admission.findOne({ where: { comn_enrol_no: comnEnrolNo, active: true } });

const getStudentBatchesForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;
    if (!comn_enrol_no) {
      return res.status(400).json({ success: false, message: "comn_enrol_no is required." });
    }
    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const batches = await Batch.findAll({
      where: { active: true },
      include: [
        { model: Subject, attributes: ["subject_name"] },
        { model: Teacher, attributes: ["id", "teacher_name"] },
        { model: Admission, as: "Students", where: { id: admission.id }, through: { attributes: [] } },
      ],
    });

    const data = batches.map((b) => ({
      batch_id: b.id,
      batch_name: b.batch_name,
      subject_name: b.Subject?.subject_name || null,
      teacher_name: b.Teacher?.teacher_name || null,
      timing: b.timing,
      section_label: SECTION_LABELS[b.section] || b.section,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Full attendance history (present AND absent) for every batch this
// student is in — same present-vs-absent derivation as
// attendanceController.js's getBatchWiseAttendance, just scoped to one
// student instead of one date/batch.
const getStudentAttendanceForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;
    if (!comn_enrol_no) {
      return res.status(400).json({ success: false, message: "comn_enrol_no is required." });
    }
    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const batches = await Batch.findAll({
      where: { active: true },
      include: [
        { model: Subject, attributes: ["subject_name"] },
        { model: Admission, as: "Students", where: { id: admission.id }, through: { attributes: [] } },
      ],
    });
    const batchById = new Map(batches.map((b) => [b.id, b]));
    const batchIds = batches.map((b) => b.id);

    const sessions = batchIds.length
      ? await BatchSession.findAll({ where: { batch_id: batchIds }, order: [["date", "DESC"]] })
      : [];

    const attendanceRows = batchIds.length
      ? await Attendance.findAll({ where: { batch_id: batchIds, admission_id: admission.id } })
      : [];
    const presentSet = new Set(attendanceRows.map((a) => `${a.batch_id}-${a.date}`));

    const data = sessions.map((s) => {
      const b = batchById.get(s.batch_id);
      return {
        date: s.date,
        batch_name: b?.batch_name || null,
        subject_name: b?.Subject?.subject_name || null,
        topic_covered: s.topic_covered || null,
        status: presentSet.has(`${s.batch_id}-${s.date}`) ? "Present" : "Absent",
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createLeaveRequestFromApp = async (req, res) => {
  try {
    const { comn_enrol_no, batch_id, session_date, description, leave_type } = req.body;
    if (!comn_enrol_no || !batch_id || !session_date || !description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "comn_enrol_no, batch_id, session_date and description are required.",
      });
    }
    const type = leave_type || "advance";
    if (!VALID_LEAVE_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "leave_type must be advance or retroactive." });
    }

    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const batch = await Batch.findOne({
      where: { id: batch_id, active: true },
      include: [{ model: Admission, as: "Students", where: { id: admission.id }, through: { attributes: [] } }],
    });
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found, or this student isn't enrolled in it.",
      });
    }

    const leaveRequest = await LeaveRequest.create({
      admin_id: batch.admin_id,
      batch_id: batch.id,
      admission_id: admission.id,
      session_date,
      description: description.trim(),
      leave_type: type,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Leave request submitted.", data: leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStudentLeaveRequestsForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;
    if (!comn_enrol_no) {
      return res.status(400).json({ success: false, message: "comn_enrol_no is required." });
    }
    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const requests = await LeaveRequest.findAll({
      where: { admission_id: admission.id },
      order: [["requested_at", "DESC"]],
    });
    const batchIds = [...new Set(requests.map((r) => r.batch_id))];
    const batches = batchIds.length
      ? await Batch.findAll({ where: { id: batchIds }, attributes: ["id", "batch_name"] })
      : [];
    const batchNameById = new Map(batches.map((b) => [b.id, b.batch_name]));

    const data = requests.map((r) => ({
      id: r.id,
      batch_name: batchNameById.get(r.batch_id) || null,
      session_date: r.session_date,
      description: r.description,
      leave_type: r.leave_type,
      status: r.status,
      requested_at: r.requested_at,
      reviewed_at: r.reviewed_at,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTeacherLeaveRequests,
  reviewLeaveRequest,
  getStudentBatchesForApp,
  getStudentAttendanceForApp,
  createLeaveRequestFromApp,
  getStudentLeaveRequestsForApp,
};
