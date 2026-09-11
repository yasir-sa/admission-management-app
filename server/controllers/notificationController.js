const Notification = require("../models/Notification");
const Admission = require("../models/Admission");
const Batch = require("../models/Batch");
const { parseTimeRange } = require("../utils/timeRange");
const { SECTION_DAYS } = require("../utils/sections");

const minutesToHHMM = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Best-effort immediate push to the Student App's own webhook for instant
// "Send Now" delivery — reuses the same key already shared for their
// attendance-summary API (they call it COURSE_ADMISSION_API_KEY on their
// side). Falls back to the existing pull/poll + ack flow automatically:
// a failed push just leaves the row undelivered, so it's still picked up
// by their GET /notifications bulk poll.
const pushNotificationToStudentApp = async ({ comn_enrol_no, title, description, notification_id }) => {
  if (!process.env.STUDENT_APP_NOTIFICATION_WEBHOOK_URL) {
    return { delivered: false, reason: "webhook_not_configured" };
  }
  try {
    const response = await fetch(process.env.STUDENT_APP_NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.STUDENT_APP_ATTENDANCE_API_KEY,
      },
      body: JSON.stringify({ comn_enrol_no, title, description, notification_id }),
    });
    const data = await response.json().catch(() => ({}));
    return { delivered: Boolean(data.delivered), reason: data.reason || null };
  } catch (err) {
    return { delivered: false, reason: "network_error: " + err.message };
  }
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

    // Try instant push first; a failure here isn't fatal — the row stays
    // undelivered and the Student App's own poll will pick it up.
    try {
      const pushResult = await pushNotificationToStudentApp({
        comn_enrol_no: admission.comn_enrol_no,
        title: notification.title,
        description: notification.description,
        notification_id: notification.id,
      });
      if (pushResult.delivered) {
        await notification.update({ delivered: true, delivered_at: new Date() });
      } else if (pushResult.reason) {
        console.error(`Notification ${notification.id} push not delivered: ${pushResult.reason}`);
      }
    } catch (err) {
      console.error(`Notification ${notification.id} push failed:`, err.message);
    }

    res.status(201).json({
      success: true,
      message: "Notification sent.",
      data: await notification.reload(),
    });
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

// Which days this student actually has a class, across every active batch
// they're in (union — a student in more than one batch/section is "in
// class" on any day either one runs). Bulk form takes many admission ids
// in one query so the bulk endpoints below don't do it once per student.
const classDaysByAdmissionId = async (admissionIds) => {
  if (!admissionIds.length) return new Map();
  const batches = await Batch.findAll({
    where: { active: true },
    include: [{ model: Admission, as: "Students", where: { id: admissionIds }, through: { attributes: [] } }],
  });
  const map = new Map(admissionIds.map((id) => [id, new Set()]));
  batches.forEach((b) => {
    const days = SECTION_DAYS[b.section] || [];
    (b.Students || []).forEach((s) => {
      days.forEach((d) => map.get(s.id)?.add(d));
    });
  });
  const result = new Map();
  map.forEach((set, id) => result.set(id, [...set]));
  return result;
};

// Immediate "Send" notifications, pull model — the Student App polls this
// (per-student with comn_enrol_no, or in bulk without it — bulk is the
// one to use for a background job checking every student, so it isn't
// one HTTP call per student per poll cycle), delivers via its own FCM,
// then acks (see below) so it isn't re-sent.
const getNotificationsForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;
    let admissionFilter;
    let admissionById = new Map();

    if (comn_enrol_no) {
      const admission = await findAdmissionByEnrolNo(comn_enrol_no);
      if (!admission) {
        return res.status(404).json({ success: false, message: "Student not found." });
      }
      admissionFilter = [admission.id];
      admissionById.set(admission.id, admission);
    } else {
      const admissions = await Admission.findAll({
        where: { active: true },
        attributes: ["id", "comn_enrol_no"],
      });
      admissionFilter = admissions.map((a) => a.id);
      admissionById = new Map(admissions.map((a) => [a.id, a]));
    }

    const notifications = admissionFilter.length
      ? await Notification.findAll({
          where: { admission_id: admissionFilter, delivered: false },
          order: [["created_at", "ASC"]],
        })
      : [];

    res.status(200).json({
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        comn_enrol_no: admissionById.get(n.admission_id)?.comn_enrol_no || null,
        title: n.title,
        description: n.description,
        created_at: n.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Single ack — kept for the per-student flow. Only ack once you've
// confirmed genuine delivery (FCM accepted it); if delivery failed (no
// token, stale token, etc.) don't ack, so it's naturally retried once a
// valid token exists — never mark something "delivered" that wasn't.
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

// Bulk ack — for the background-job flow, acknowledge everything that
// was actually delivered in one call instead of one round trip each.
const ackNotificationsBulkForApp = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids (non-empty array) is required." });
    }
    const [count] = await Notification.update(
      { delivered: true, delivered_at: new Date() },
      { where: { id: ids } }
    );
    res.status(200).json({ success: true, message: `Acknowledged ${count} notification(s).` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Recurring in/out schedule — the Student App reads this and decides
// locally when to fire the "you haven't checked in/out yet" reminder,
// using its own attendance records to know whether one is even due, and
// `class_days` to know whether today is even a class day at all for this
// student (a batch's section — fast_track/normal_mwf/etc. — doesn't run
// every day of the week). Per-student with comn_enrol_no, or bulk (every
// active student in one call) without it.
const getScheduleForApp = async (req, res) => {
  try {
    const { comn_enrol_no } = req.query;

    if (comn_enrol_no) {
      const admission = await findAdmissionByEnrolNo(comn_enrol_no);
      if (!admission) {
        return res.status(404).json({ success: false, message: "Student not found." });
      }
      const { effective_in_time, effective_out_time, source } = effectiveScheduleFor(admission);
      const classDays = await classDaysByAdmissionId([admission.id]);
      return res.status(200).json({
        success: true,
        data: {
          effective_in_time,
          effective_out_time,
          source,
          class_days: classDays.get(admission.id) || [],
          notification_title: admission.notification_title || null,
          notification_description: admission.notification_description || null,
        },
      });
    }

    const admissions = await Admission.findAll({ where: { active: true } });
    const classDays = await classDaysByAdmissionId(admissions.map((a) => a.id));
    const data = admissions.map((admission) => {
      const { effective_in_time, effective_out_time, source } = effectiveScheduleFor(admission);
      return {
        comn_enrol_no: admission.comn_enrol_no,
        effective_in_time,
        effective_out_time,
        source,
        class_days: classDays.get(admission.id) || [],
        notification_title: admission.notification_title || null,
        notification_description: admission.notification_description || null,
      };
    });
    res.status(200).json({ success: true, data });
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
  ackNotificationsBulkForApp,
  getScheduleForApp,
};
