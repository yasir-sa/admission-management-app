const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const Group = require("../models/Group");
const Admission = require("../models/Admission");
const WeeklySchedule = require("../models/WeeklySchedule");
const WeeklyScheduleSlot = require("../models/WeeklyScheduleSlot");
const Attendance = require("../models/Attendance");
const { markAttendanceForAdmission } = require("./attendanceController");
const { sendOtpEmail } = require("../utils/mailer");

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

const getTodayName = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" });

const parseStartMinutes = (timing) => {
  if (!timing) return Infinity;
  const match = timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Infinity;
  let [, hh, mm, ampm] = match;
  hh = parseInt(hh, 10);
  mm = parseInt(mm, 10);
  if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
  if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
  return hh * 60 + mm;
};

const lookupBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const teacher = await Teacher.findOne({ where: { slug, active: true } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "This link is not valid",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        teacher_name: teacher.teacher_name,
        masked_email: teacher.email ? maskEmail(teacher.email) : null,
        is_verified: teacher.is_verified,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestOtp = async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) {
      return res.status(400).json({ success: false, message: "Invalid link" });
    }

    const teacher = await Teacher.findOne({ where: { slug, active: true } });
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "This link is not valid" });
    }
    if (!teacher.email) {
      return res.status(400).json({
        success: false,
        message: "No email on file for this teacher. Contact the office.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await teacher.update({ otp, otp_expires: otpExpires });
    await sendOtpEmail(teacher.email, otp);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${maskEmail(teacher.email)}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { slug, otp } = req.body;
    if (!slug || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP is required" });
    }

    const teacher = await Teacher.findOne({ where: { slug, active: true } });
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "This link is not valid" });
    }

    if (
      !teacher.otp ||
      teacher.otp !== otp ||
      !teacher.otp_expires ||
      new Date() > new Date(teacher.otp_expires)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    await teacher.update({ is_verified: true, otp: null, otp_expires: null });

    res.status(200).json({
      success: true,
      message: "Verified successfully",
      data: { slug: teacher.slug, teacher_name: teacher.teacher_name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const { slug } = req.params;
    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true },
      include: [{ model: Course, through: { attributes: [] } }],
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const groups = await Group.findAll({
      where: { teacher_id: teacher.id, active: true },
      include: [
        { model: Course },
        { model: Admission, as: "Students", through: { attributes: [] } },
      ],
    });
    const groupIds = groups.map((g) => g.id);

    const activeSchedule = await WeeklySchedule.findOne({
      where: { is_on: true, active: true },
      include: [
        {
          model: WeeklyScheduleSlot,
          as: "Slots",
          where: groupIds.length > 0 ? { group_id: groupIds } : { group_id: -1 },
          required: false,
          include: [
            {
              model: Group,
              include: [{ model: Course }],
            },
          ],
        },
      ],
    });

    const allSlots = activeSchedule?.Slots || [];
    const today = getTodayName();
    const todaySlots = allSlots
      .filter((s) => s.day_of_week === today)
      .sort((a, b) => parseStartMinutes(a.timing) - parseStartMinutes(b.timing));

    const todaySlotIds = todaySlots.map((s) => s.id);
    const attendedToday = todaySlotIds.length
      ? await Attendance.findAll({
          where: {
            date: new Date().toISOString().slice(0, 10),
            weekly_schedule_slot_id: todaySlotIds,
          },
        })
      : [];
    // key = `${slotId}-${admissionId}` so presence is scoped to this specific
    // class session, not shared across other slots for the same group/day
    const attendedBySlot = new Set(
      attendedToday.map((a) => `${a.weekly_schedule_slot_id}-${a.admission_id}`)
    );

    const groupsById = new Map(groups.map((g) => [g.id, g]));

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          teacher_name: teacher.teacher_name,
          qualification: teacher.qualification,
          courses: (teacher.Courses || []).map((c) => c.course_name),
        },
        groups: groups.map((g) => ({
          id: g.id,
          group_name: g.group_name,
          course_name: g.Course?.course_name,
          students: (g.Students || []).map((s) => ({
            id: s.id,
            applicant_name: s.applicant_name,
            comn_enrol_no: s.comn_enrol_no,
          })),
        })),
        weeklyScheduleName: activeSchedule?.schedule_name || null,
        today,
        todayClasses: todaySlots.map((s) => {
          const group = groupsById.get(s.group_id);
          return {
            id: s.id,
            group_id: s.group_id,
            group_name: s.Group?.group_name,
            course_name: s.Group?.Course?.course_name,
            timing: s.timing,
            students: (group?.Students || []).map((student) => ({
              id: student.id,
              applicant_name: student.applicant_name,
              comn_enrol_no: student.comn_enrol_no,
              already_present: attendedBySlot.has(`${s.id}-${student.id}`),
            })),
          };
        }),
        allSlots: allSlots.map((s) => ({
          id: s.id,
          day_of_week: s.day_of_week,
          group_id: s.group_id,
          group_name: s.Group?.group_name,
          timing: s.timing,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { slug, admission_id, weekly_schedule_slot_id } = req.body;
    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const groups = await Group.findAll({
      where: { teacher_id: teacher.id, active: true },
      include: [{ model: Admission, as: "Students", through: { attributes: [] } }],
    });
    const allowedAdmissionIds = new Set();
    const groupIds = groups.map((g) => g.id);
    groups.forEach((g) =>
      (g.Students || []).forEach((s) => allowedAdmissionIds.add(s.id))
    );

    if (!allowedAdmissionIds.has(Number(admission_id))) {
      return res.status(403).json({
        success: false,
        message: "This student is not in your assigned groups",
      });
    }

    let slotId = null;
    if (weekly_schedule_slot_id) {
      const slot = await WeeklyScheduleSlot.findByPk(weekly_schedule_slot_id);
      if (!slot || !groupIds.includes(slot.group_id)) {
        return res.status(403).json({
          success: false,
          message: "This class is not one of your assigned groups",
        });
      }
      slotId = slot.id;
    }

    const admission = await Admission.findByPk(admission_id);
    if (!admission) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const result = await markAttendanceForAdmission(admission, slotId);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  lookupBySlug,
  requestOtp,
  verifyOtp,
  getDashboard,
  markAttendance,
};
