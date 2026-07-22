const { Op } = require("sequelize");
const Batch = require("../models/Batch");
const Subject = require("../models/Subject");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const Admission = require("../models/Admission");
const BatchSession = require("../models/BatchSession");
const BatchSubstitution = require("../models/BatchSubstitution");
const { parseTimeRange, rangesOverlap } = require("../utils/timeRange");
const {
  VALID_SECTIONS,
  SECTION_LABELS,
  sectionsOverlapOnDays,
  isSectionActiveToday,
} = require("../utils/sections");

const includeOptionsFor = (todayStr) => [
  { model: Subject, attributes: ["id", "subject_name", "parent_id"] },
  { model: Teacher, attributes: ["id", "teacher_name"] },
  { model: Admission, as: "Students", through: { attributes: [] } },
  {
    model: BatchSession,
    where: { date: todayStr },
    required: false,
  },
  {
    model: BatchSubstitution,
    as: "Substitutions",
    where: { date: todayStr },
    required: false,
    include: [{ model: Teacher, as: "SubstituteTeacher" }],
  },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

// Courses whose syllabus includes this subject, for a given admin.
const coursesForSubject = async (subjectId, adminId) => {
  const subject = await Subject.findOne({
    where: { id: subjectId, admin_id: adminId },
    include: [{ model: Course, where: { admin_id: adminId }, required: false }],
  });
  return subject ? subject.Courses || [] : [];
};

const getSubjectTeachers = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const adminId = req.admin.adminId;
    const courses = await coursesForSubject(subjectId, adminId);
    if (courses.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    const coursesWithTeachers = await Course.findAll({
      where: { id: courses.map((c) => c.id), admin_id: adminId },
      include: [{ model: Teacher, where: { active: true }, required: false }],
    });
    const teacherMap = new Map();
    coursesWithTeachers.forEach((course) => {
      (course.Teachers || []).forEach((t) => teacherMap.set(t.id, t));
    });
    res.status(200).json({
      success: true,
      data: Array.from(teacherMap.values()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubjectStudents = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const adminId = req.admin.adminId;
    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "subjectId is required.",
      });
    }
    const courses = await coursesForSubject(subjectId, adminId);
    const courseNames = new Set(
      courses.map((c) => (c.course_name || "").trim().toLowerCase())
    );
    if (courseNames.size === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    const admissions = await Admission.findAll({
      where: { admin_id: adminId, active: true },
    });
    // Every student admitted in a course whose syllabus includes this
    // subject is eligible — batch timing doesn't need to match their
    // registered timing preference (that field is free-typed and rarely
    // matches an exact batch slot string).
    const matched = admissions.filter((a) =>
      courseNames.has((a.course_name || "").trim().toLowerCase())
    );
    res.status(200).json({ success: true, data: matched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const findConflicts = async ({ adminId, section, timing, subjectId, teacherId, excludeId }) => {
  const newRange = parseTimeRange(timing);
  const where = { admin_id: adminId, active: true };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const existingBatches = await Batch.findAll({ where });

  const sameSlotSameSubject = existingBatches.find(
    (b) =>
      b.section === section &&
      b.subject_id === Number(subjectId) &&
      b.timing === timing
  );
  if (sameSlotSameSubject) {
    return `This subject already has a batch in this section at this exact timing.`;
  }

  if (newRange) {
    const teacherClash = existingBatches.find((b) => {
      if (b.teacher_id !== Number(teacherId)) return false;
      if (!sectionsOverlapOnDays(b.section, section)) return false;
      const existingRange = parseTimeRange(b.timing);
      if (!existingRange) return false;
      return rangesOverlap(newRange, existingRange);
    });
    if (teacherClash) {
      return `This teacher already has "${teacherClash.batch_name}" (${teacherClash.timing}) scheduled on an overlapping day. Choose a different time or teacher.`;
    }
  }

  return null;
};

const createBatch = async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    const {
      batch_name,
      section,
      subject_id,
      teacher_id,
      timing,
      num_days,
      admission_ids,
    } = req.body;

    const errors = {};
    if (!batch_name || !batch_name.trim()) errors.batch_name = "Batch Name is required.";
    if (!VALID_SECTIONS.includes(section)) errors.section = "Invalid section.";
    if (!subject_id) errors.subject_id = "Subject is required.";
    if (!teacher_id) errors.teacher_id = "Teacher is required.";
    if (!timing || !timing.trim()) errors.timing = "Timing is required.";
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const [subject, teacher] = await Promise.all([
      Subject.findOne({ where: { id: subject_id, admin_id: adminId } }),
      Teacher.findOne({ where: { id: teacher_id, admin_id: adminId, active: true } }),
    ]);
    if (!subject) {
      return res.status(404).json({ success: false, errors: { subject_id: "Subject not found" } });
    }
    if (!teacher) {
      return res.status(404).json({ success: false, errors: { teacher_id: "Teacher not found" } });
    }

    const conflictMessage = await findConflicts({
      adminId,
      section,
      timing,
      subjectId: subject_id,
      teacherId: teacher_id,
    });
    if (conflictMessage) {
      return res.status(409).json({ success: false, message: conflictMessage });
    }

    const batch = await Batch.create({
      admin_id: adminId,
      batch_name: batch_name.trim(),
      section,
      subject_id,
      teacher_id,
      timing: timing.trim(),
      num_days: num_days === "" || num_days === undefined ? null : num_days,
    });

    if (admission_ids && admission_ids.length > 0) {
      const ownedCount = await Admission.count({
        where: { id: admission_ids, admin_id: adminId },
      });
      if (ownedCount !== admission_ids.length) {
        return res.status(404).json({ success: false, message: "One or more students not found" });
      }
      await batch.setStudents(admission_ids);
    }

    const created = await Batch.findByPk(batch.id, {
      include: includeOptionsFor(todayStr()),
    });
    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: created,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllBatches = async (req, res) => {
  try {
    const isActive = req.query.active !== "false";
    const batches = await Batch.findAll({
      where: { active: isActive, admin_id: req.admin.adminId },
      include: includeOptionsFor(todayStr()),
      order: [["id", "ASC"]],
    });
    const data = batches.map((b) => {
      const json = b.toJSON();
      json.section_active_today = isSectionActiveToday(b.section);
      return json;
    });
    res.status(200).json({ success: true, data, sectionLabels: SECTION_LABELS });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.adminId;
    const batch = await Batch.findOne({ where: { id, admin_id: adminId } });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const {
      batch_name,
      section,
      subject_id,
      teacher_id,
      timing,
      num_days,
      admission_ids,
    } = req.body;

    const errors = {};
    if (!batch_name || !batch_name.trim()) errors.batch_name = "Batch Name is required.";
    if (!VALID_SECTIONS.includes(section)) errors.section = "Invalid section.";
    if (!subject_id) errors.subject_id = "Subject is required.";
    if (!teacher_id) errors.teacher_id = "Teacher is required.";
    if (!timing || !timing.trim()) errors.timing = "Timing is required.";
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const conflictMessage = await findConflicts({
      adminId,
      section,
      timing,
      subjectId: subject_id,
      teacherId: teacher_id,
      excludeId: id,
    });
    if (conflictMessage) {
      return res.status(409).json({ success: false, message: conflictMessage });
    }

    await batch.update({
      batch_name: batch_name.trim(),
      section,
      subject_id,
      teacher_id,
      timing: timing.trim(),
      num_days: num_days === "" || num_days === undefined ? null : num_days,
    });

    if (admission_ids) {
      const ownedCount = await Admission.count({
        where: { id: admission_ids, admin_id: adminId },
      });
      if (ownedCount !== admission_ids.length) {
        return res.status(404).json({ success: false, message: "One or more students not found" });
      }
      await batch.setStudents(admission_ids);
    }

    const updated = await Batch.findByPk(id, {
      include: includeOptionsFor(todayStr()),
    });
    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Drag-and-drop: move an existing batch to a different section, re-running
// the same conflict checks against the new section (subject/timing/teacher
// stay the same, only the section changes).
const moveBatchSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { section } = req.body;
    const adminId = req.admin.adminId;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: "Invalid section." });
    }

    const batch = await Batch.findOne({ where: { id, admin_id: adminId } });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    if (batch.section === section) {
      return res.status(200).json({ success: true, message: "No change", data: batch });
    }

    const conflictMessage = await findConflicts({
      adminId,
      section,
      timing: batch.timing,
      subjectId: batch.subject_id,
      teacherId: batch.teacher_id,
      excludeId: id,
    });
    if (conflictMessage) {
      return res.status(409).json({ success: false, message: conflictMessage });
    }

    await batch.update({ section });
    const updated = await Batch.findByPk(id, {
      include: includeOptionsFor(todayStr()),
    });
    res.status(200).json({
      success: true,
      message: "Batch moved successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Today-only substitute for a batch whose regular teacher is unavailable —
// mirrors the WeeklyScheduleSlot substitution flow, scoped to this Batch.
const assignBatchSubstitute = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, substitute_teacher_id, reason } = req.body;
    const adminId = req.admin.adminId;
    if (!date || !substitute_teacher_id) {
      return res.status(400).json({
        success: false,
        message: "Date and Substitute Teacher are required.",
      });
    }

    const batch = await Batch.findOne({ where: { id, admin_id: adminId } });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const teacher = await Teacher.findOne({
      where: { id: substitute_teacher_id, admin_id: adminId, active: true },
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Substitute teacher not found" });
    }

    const [sub, created] = await BatchSubstitution.findOrCreate({
      where: { batch_id: id, date },
      defaults: { substitute_teacher_id, reason: reason || null },
    });
    if (!created) {
      await sub.update({ substitute_teacher_id, reason: reason || null });
    }

    res.status(200).json({
      success: true,
      message: `${teacher.teacher_name} set as temporary substitute for ${date}`,
      data: sub,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeBatchSubstitute = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const adminId = req.admin.adminId;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required." });
    }
    const batch = await Batch.findOne({ where: { id, admin_id: adminId } });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    await BatchSubstitution.destroy({ where: { batch_id: id, date } });
    res.status(200).json({
      success: true,
      message: "Substitute removed — original teacher continues.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findOne({
      where: { id, admin_id: req.admin.adminId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    await batch.update({ active: false });
    res.status(200).json({ success: true, message: "Batch removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSubjectTeachers,
  getSubjectStudents,
  createBatch,
  getAllBatches,
  updateBatch,
  moveBatchSection,
  assignBatchSubstitute,
  removeBatchSubstitute,
  deleteBatch,
};
