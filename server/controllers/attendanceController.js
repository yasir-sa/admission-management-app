const Attendance = require("../models/Attendance");
const Admission = require("../models/Admission");
const WeeklySchedule = require("../models/WeeklySchedule");
const WeeklyScheduleSlot = require("../models/WeeklyScheduleSlot");
const Group = require("../models/Group");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const Holiday = require("../models/Holiday");
const SlotSubstitution = require("../models/SlotSubstitution");
const ClassSession = require("../models/ClassSession");
const TeacherAvailability = require("../models/TeacherAvailability");
const { parseTimeRange } = require("../utils/timeRange");

const getTodayName = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" });

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

    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });

    const activeSchedule = todayHoliday
      ? null
      : await WeeklySchedule.findOne({
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

const getTeacherAttendance = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dateStr = req.query.date || todayStr;
    const isToday = dateStr === todayStr;

    const holiday = await Holiday.findOne({ where: { date: dateStr } });
    if (holiday) {
      return res.status(200).json({
        success: true,
        data: [],
        holiday: { date: holiday.date, description: holiday.description },
      });
    }

    const dayName = new Date(`${dateStr}T00:00:00`).toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    const activeSchedule = await WeeklySchedule.findOne({
      where: { is_on: true, active: true },
      include: [
        {
          model: WeeklyScheduleSlot,
          as: "Slots",
          where: { day_of_week: dayName },
          required: false,
          include: [
            {
              model: Group,
              include: [{ model: Teacher }, { model: Course }],
            },
          ],
        },
      ],
    });

    const slots = activeSchedule?.Slots || [];
    const slotIds = slots.map((s) => s.id);

    const substitutions = slotIds.length
      ? await SlotSubstitution.findAll({
          where: { weekly_schedule_slot_id: slotIds, date: dateStr },
          include: [{ model: Teacher, as: "SubstituteTeacher" }],
        })
      : [];
    const subBySlot = new Map(
      substitutions.map((s) => [s.weekly_schedule_slot_id, s])
    );

    const sessions = slotIds.length
      ? await ClassSession.findAll({
          where: { weekly_schedule_slot_id: slotIds, date: dateStr },
        })
      : [];
    const sessionBySlot = new Map(
      sessions.map((s) => [s.weekly_schedule_slot_id, s])
    );

    const originalTeacherIds = [
      ...new Set(slots.map((s) => s.Group?.teacher_id).filter(Boolean)),
    ];
    const availabilityRecs = originalTeacherIds.length
      ? await TeacherAvailability.findAll({
          where: { teacher_id: originalTeacherIds, date: dateStr },
        })
      : [];
    const availabilityByTeacher = new Map(
      availabilityRecs.map((a) => [a.teacher_id, a])
    );

    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const data = [];
    slots.forEach((slot) => {
      const range = parseTimeRange(slot.timing);
      const hasEnded = isToday ? !!range && nowMinutes > range.endMinutes : true;
      const sub = subBySlot.get(slot.id);
      const session = sessionBySlot.get(slot.id);
      const originalTeacher = slot.Group?.Teacher;

      let status;
      if (session?.ended_at) status = "Completed";
      else if (session?.started_at) status = "In Progress";
      else if (hasEnded) status = "Absent";
      else status = "Not Started";

      if (sub) {
        // Original teacher was unavailable and got substituted out — one row,
        // showing the original teacher plus the substitute's name and the
        // actual class completion via the Substitute / Completed columns.
        const availRec = availabilityByTeacher.get(originalTeacher?.id);
        data.push({
          id: `teacher-orig-${slot.id}-${dateStr}`,
          teacher_name: originalTeacher?.teacher_name || "-",
          is_substitute: false,
          substituted_out: true,
          substitute_teacher_name: sub.SubstituteTeacher?.teacher_name || null,
          reason: availRec?.reason || null,
          group_name: slot.Group?.group_name,
          course_name: slot.Group?.Course?.course_name,
          timing: slot.timing,
          date: dateStr,
          status: "Substituted",
          started_at: session?.started_at || null,
          ended_at: session?.ended_at || null,
        });
      } else {
        data.push({
          id: `teacher-${slot.id}-${dateStr}`,
          teacher_name: originalTeacher?.teacher_name || "-",
          is_substitute: false,
          substituted_out: false,
          substitute_teacher_name: null,
          reason: null,
          group_name: slot.Group?.group_name,
          course_name: slot.Group?.Course?.course_name,
          timing: slot.timing,
          date: dateStr,
          status,
          started_at: session?.started_at || null,
          ended_at: session?.ended_at || null,
        });
      }
    });

    res.status(200).json({ success: true, data });
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
  getTeacherAttendance,
};
