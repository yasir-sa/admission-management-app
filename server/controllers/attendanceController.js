const Attendance = require("../models/Attendance");
const Admission = require("../models/Admission");
const WeeklySchedule = require("../models/WeeklySchedule");
const WeeklyScheduleSlot = require("../models/WeeklyScheduleSlot");
const Group = require("../models/Group");
const Course = require("../models/Course");

const getTodayName = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" });

const parseTimePart = (str) => {
  const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  return {
    hour: parseInt(match[1], 10),
    minute: match[2] ? parseInt(match[2], 10) : 0,
    ampm: match[3] ? match[3].toUpperCase() : null,
  };
};

const parseTimeRange = (timing) => {
  if (!timing) return null;
  const parts = timing.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const start = parseTimePart(parts[0]);
  const end = parseTimePart(parts[1]);
  if (!start || !end) return null;

  if (!start.ampm && end.ampm) start.ampm = end.ampm;
  if (!end.ampm && start.ampm) end.ampm = start.ampm;

  const to24 = (t) => {
    let h = t.hour;
    if (t.ampm === "PM" && h !== 12) h += 12;
    if (t.ampm === "AM" && h === 12) h = 0;
    return h * 60 + t.minute;
  };

  return { startMinutes: to24(start), endMinutes: to24(end) };
};

const markAttendanceForAdmission = async (admission, slotId = null) => {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await Attendance.findOne({
    where: {
      admission_id: admission.id,
      date: today,
      weekly_schedule_slot_id: slotId,
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

    const slotIds = [
      ...new Set(
        attendance.map((a) => a.weekly_schedule_slot_id).filter(Boolean)
      ),
    ];
    const slots = slotIds.length
      ? await WeeklyScheduleSlot.findAll({
          where: { id: slotIds },
          include: [{ model: Group, include: [{ model: Course }] }],
        })
      : [];
    const slotById = new Map(slots.map((s) => [s.id, s]));

    const presentRecords = attendance.map((a) => {
      const slot = a.weekly_schedule_slot_id
        ? slotById.get(a.weekly_schedule_slot_id)
        : null;
      return {
        id: `present-${a.id}`,
        applicant_name: a.Admission?.applicant_name || "-",
        date: a.date,
        marked_at: a.marked_at,
        status: a.status,
        group_name: slot?.Group?.group_name || null,
        course_name: slot?.Group?.Course?.course_name || null,
        timing: slot?.timing || null,
      };
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayName = getTodayName();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const activeSchedule = await WeeklySchedule.findOne({
      where: { is_on: true, active: true },
      include: [
        {
          model: WeeklyScheduleSlot,
          as: "Slots",
          where: { day_of_week: todayName },
          required: false,
          include: [
            {
              model: Group,
              include: [
                { model: Course },
                {
                  model: Admission,
                  as: "Students",
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
    });

    const absentRecords = [];
    (activeSchedule?.Slots || []).forEach((slot) => {
      const range = parseTimeRange(slot.timing);
      if (!range || nowMinutes <= range.endMinutes) return;
      const group = slot.Group;
      (group?.Students || []).forEach((student) => {
        const hasRecord = attendance.some(
          (a) =>
            a.admission_id === student.id &&
            a.date === todayStr &&
            a.weekly_schedule_slot_id === slot.id
        );
        if (!hasRecord) {
          absentRecords.push({
            id: `absent-${slot.id}-${student.id}`,
            applicant_name: student.applicant_name,
            date: todayStr,
            marked_at: null,
            status: "Absent",
            group_name: group.group_name,
            course_name: group.Course?.course_name || null,
            timing: slot.timing,
          });
        }
      });
    });

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

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByAdmission,
  scanAttendance,
  markAttendanceForAdmission,
};
