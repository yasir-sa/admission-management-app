const Attendance = require("../models/Attendance");
const Admission = require("../models/Admission");
const StudentEntryAttendance = require("../models/StudentEntryAttendance");
const Holiday = require("../models/Holiday");
const Batch = require("../models/Batch");
const Subject = require("../models/Subject");
const BatchSession = require("../models/BatchSession");
const { parseTimeRange } = require("../utils/timeRange");
const { isSectionActiveToday, SECTION_LABELS } = require("../utils/sections");

const markAttendanceForAdmission = async (admission, slotId = null, batchId = null) => {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await Attendance.findOne({
    where: {
      admission_id: admission.id,
      date: today,
      weekly_schedule_slot_id: slotId,
      batch_id: batchId,
    },
  });
  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        message: `${admission.applicant_name} is already marked present for this class today`,
      },
    };
  }

  const attendance = await Attendance.create({
    admission_id: admission.id,
    date: today,
    weekly_schedule_slot_id: slotId,
    batch_id: batchId,
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
    const adminId = req.admin.adminId;

    const attendance = await Attendance.findAll({
      include: [
        {
          model: Admission,
          attributes: ["applicant_name"],
          where: { admin_id: adminId },
        },
      ],
      order: [["date", "DESC"]],
    });

    const entryRecords = await StudentEntryAttendance.findAll({
      where: { admin_id: adminId },
      attributes: ["admission_id", "date"],
    });
    const entrySet = new Set(
      entryRecords.map((e) => `${e.admission_id}_${e.date}`)
    );
    const hasEntry = (admissionId, date) =>
      entrySet.has(`${admissionId}_${date}`);

    const batchIds = [
      ...new Set(attendance.map((a) => a.batch_id).filter(Boolean)),
    ];
    const attBatches = batchIds.length
      ? await Batch.findAll({
          where: { id: batchIds },
          include: [{ model: Subject, attributes: ["subject_name"] }],
        })
      : [];
    const batchById = new Map(attBatches.map((b) => [b.id, b]));

    const presentRecords = attendance.map((a) => {
      const batch = a.batch_id ? batchById.get(a.batch_id) : null;
      const entryFound = hasEntry(a.admission_id, a.date);
      return {
        id: `present-${a.id}`,
        applicant_name: a.Admission?.applicant_name || "-",
        date: a.date,
        marked_at: a.marked_at,
        status: a.status,
        has_entry_attendance: entryFound,
        real_status: a.status === "Present" && entryFound ? "Present" : "Absent",
        group_name: batch?.batch_name || null,
        course_name: batch?.Subject?.subject_name || null,
        timing: batch?.timing || null,
      };
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });

    const absentRecords = [];

    // "Class ended, no attendance row yet" absentee
    // detection, for Batches whose section runs today.
    if (!todayHoliday) {
      const activeBatches = await Batch.findAll({
        where: { admin_id: adminId, active: true },
        include: [
          { model: Subject, attributes: ["subject_name"] },
          { model: Admission, as: "Students", through: { attributes: [] } },
        ],
      });
      activeBatches
        .filter((b) => isSectionActiveToday(b.section))
        .forEach((batch) => {
          const range = parseTimeRange(batch.timing);
          if (!range || nowMinutes <= range.endMinutes) return;
          (batch.Students || []).forEach((student) => {
            const hasRecord = attendance.some(
              (a) =>
                a.admission_id === student.id &&
                a.date === todayStr &&
                a.batch_id === batch.id
            );
            if (!hasRecord) {
              absentRecords.push({
                id: `absent-batch-${batch.id}-${student.id}`,
                applicant_name: student.applicant_name,
                date: todayStr,
                marked_at: null,
                status: "Absent",
                has_entry_attendance: hasEntry(student.id, todayStr),
                real_status: "Absent",
                group_name: batch.batch_name,
                course_name: batch.Subject?.subject_name || null,
                timing: batch.timing,
              });
            }
          });
        });
    }

    res.status(200).json({
      success: true,
      data: [...absentRecords, ...presentRecords],
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

// Concept 2 attendance page — one row per student, per batch that actually
// held class on the given date. "Entry" and "Teacher" attendance are two
// independent signals; Final Status only counts a student Present when both
// agree (same cross-check used elsewhere in the app), so a student who was
// marked present by the teacher but never physically entered campus (or vice
// versa) shows up as Absent overall.
const getBatchWiseAttendance = async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { batch_id } = req.query;

    const where = { admin_id: adminId, active: true };
    if (batch_id) where.id = batch_id;

    const batches = await Batch.findAll({
      where,
      include: [
        { model: Subject, attributes: ["subject_name"] },
        { model: Admission, as: "Students", through: { attributes: [] } },
      ],
      order: [["batch_name", "ASC"]],
    });

    const batchIds = batches.map((b) => b.id);
    const sessions = batchIds.length
      ? await BatchSession.findAll({ where: { batch_id: batchIds, date } })
      : [];
    const sessionByBatch = new Map(sessions.map((s) => [s.batch_id, s]));

    const classAttendance = batchIds.length
      ? await Attendance.findAll({ where: { batch_id: batchIds, date } })
      : [];
    const classAttendanceSet = new Set(
      classAttendance.map((a) => `${a.batch_id}-${a.admission_id}`)
    );

    const admissionIds = [
      ...new Set(batches.flatMap((b) => (b.Students || []).map((s) => s.id))),
    ];
    const entryAttendance = admissionIds.length
      ? await StudentEntryAttendance.findAll({
          where: { admission_id: admissionIds, date },
        })
      : [];
    const entrySet = new Set(entryAttendance.map((e) => e.admission_id));

    const rows = [];
    batches.forEach((b) => {
      const session = sessionByBatch.get(b.id);
      if (!session) return; // this batch didn't hold class on this date
      (b.Students || []).forEach((student) => {
        const teacherAttendance = classAttendanceSet.has(`${b.id}-${student.id}`);
        const entryAtt = entrySet.has(student.id);
        rows.push({
          student_id: student.id,
          student_name: student.applicant_name,
          comn_enrol_no: student.comn_enrol_no,
          batch_id: b.id,
          batch_name: b.batch_name,
          subject_name: b.Subject?.subject_name || null,
          topic_covered: session.topic_covered || null,
          entry_attendance: entryAtt,
          teacher_attendance: teacherAttendance,
          final_status: teacherAttendance && entryAtt ? "Present" : "Absent",
        });
      });
    });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByAdmission,
  scanAttendance,
  markAttendanceForAdmission,
  getBatchWiseAttendance,
};
