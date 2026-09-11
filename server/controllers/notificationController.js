const Notification = require("../models/Notification");
const Admission = require("../models/Admission");
const { parseTimeRange } = require("../utils/timeRange");

const minutesToHHMM = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Custom schedule (if set) wins outright over `timings` — not merged, not
// compared, just a straight override per student. See Admission.js's
// comment on scheduled_in_time/scheduled_out_time.
const effectiveScheduleFor = (admission) => {
  if (admission.scheduled_in_time || admission.scheduled_out_time) {
    return {
      effective_in_time: admission.scheduled_in_time || null,
      effective_out_time: admission.scheduled_out_time || null,
      source: "schedule",
    };
  }
  const range = parseTimeRange(admission.timings);
  if (!range) {
    return { effective_in_time: null, effective_out_time: null, source: "none" };
  }
  return {
    effective_in_time: minutesToHHMM(range.startMinutes),
    effective_out_time: minutesToHHMM(range.endMinutes),
    source: "timings",
  };
};

// ============================================================
// Admin-side (cookie auth, req.admin) — the new Student Notifications page.
// ============================================================

const sendNotification = async (req, res) => {
  try {
    const { admission_id, title, description } = req.body;
    if (!admission_id || !title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "admission_id, title and description are required.",
      });
    }
    const admission = await Admission.findOne({
      where: { id: admission_id, admin_id: req.admin.adminId, active: true },
    });
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const notification = await Notification.create({
      admin_id: req.admin.adminId,
      admission_id: admission.id,
      title: title.trim(),
      description: description.trim(),
    });

    res.status(201).json({ success: true, message: "Notification queued for delivery.", data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { admin_id: req.admin.adminId },
      order: [["created_at", "DESC"]],
      limit: 100,
    });
    const admissionIds = [...new Set(notifications.map((n) => n.admission_id))];
    const admissions = admissionIds.length
      ? await Admission.findAll({
          where: { id: admissionIds },
          attributes: ["id", "applicant_name", "comn_enrol_no"],
        })
      : [];
    const admissionById = new Map(admissions.map((a) => [a.id, a]));

    const data = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      delivered: n.delivered,
      delivered_at: n.delivered_at,
      created_at: n.created_at,
      student_name: admissionById.get(n.admission_id)?.applicant_name || null,
      comn_enrol_no: admissionById.get(n.admission_id)?.comn_enrol_no || null,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveSchedule = async (req, res) => {
  try {
    const { admission_id, scheduled_in_time, scheduled_out_time, notification_title, notification_description } =
      req.body;
    if (!admission_id) {
      return res.status(400).json({ success: false, message: "admission_id is required." });
    }
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (scheduled_in_time && !timePattern.test(scheduled_in_time)) {
      return res.status(400).json({ success: false, message: "scheduled_in_time must be HH:MM (24h)." });
    }
    if (scheduled_out_time && !timePattern.test(scheduled_out_time)) {
      return res.status(400).json({ success: false, message: "scheduled_out_time must be HH:MM (24h)." });
    }

    const admission = await Admission.findOne({
      where: { id: admission_id, admin_id: req.admin.adminId, active: true },
    });
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    await admission.update({
      scheduled_in_time: scheduled_in_time || null,
      scheduled_out_time: scheduled_out_time || null,
      notification_title: notification_title?.trim() || null,
      notification_description: notification_description?.trim() || null,
    });

    res.status(200).json({ success: true, message: "Schedule saved.", data: admission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// Flutter Student App-facing (x-api-key auth, requireStudentAppAuth)
// ============================================================

const findAdmissionByEnrolNo = (comnEnrolNo) =>
  Admission.findOne({ where: { comn_enrol_no: comnEnrolNo, active: true } });

// Immediate "Send" notifications, pull model — the Student App polls this,
// delivers via its own FCM, then acks (see below) so it isn't re-sent.
const getNotificationsForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;
    if (!comn_enrol_no) {
      return res.status(400).json({ success: false, message: "comn_enrol_no is required." });
    }
    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    const notifications = await Notification.findAll({
      where: { admission_id: admission.id, delivered: false },
      order: [["created_at", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        created_at: n.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const ackNotificationForApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comn_enrol_no } = req.body;
    if (!comn_enrol_no) {
      return res.status(400).json({ success: false, message: "comn_enrol_no is required." });
    }
    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    const notification = await Notification.findOne({
      where: { id, admission_id: admission.id },
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    await notification.update({ delivered: true, delivered_at: new Date() });
    res.status(200).json({ success: true, message: "Acknowledged." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Recurring in/out schedule — the Student App reads this and decides
// locally when to fire the "you haven't checked in/out yet" reminder,
// using its own attendance records to know whether one is even due.
const getScheduleForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;
    if (!comn_enrol_no) {
      return res.status(400).json({ success: false, message: "comn_enrol_no is required." });
    }
    const admission = await findAdmissionByEnrolNo(comn_enrol_no);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    const { effective_in_time, effective_out_time, source } = effectiveScheduleFor(admission);
    res.status(200).json({
      success: true,
      data: {
        effective_in_time,
        effective_out_time,
        source,
        notification_title: admission.notification_title || null,
        notification_description: admission.notification_description || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendNotification,
  getSentNotifications,
  saveSchedule,
  getNotificationsForApp,
  ackNotificationForApp,
  getScheduleForApp,
};
