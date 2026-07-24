const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const Group = require("../models/Group");
const Admission = require("../models/Admission");
const WeeklySchedule = require("../models/WeeklySchedule");
const WeeklyScheduleSlot = require("../models/WeeklyScheduleSlot");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const TeacherAvailability = require("../models/TeacherAvailability");
const SlotSubstitution = require("../models/SlotSubstitution");
const ClassSession = require("../models/ClassSession");
const Subject = require("../models/Subject");
require("../models/CourseSubject");
const Batch = require("../models/Batch");
const BatchSession = require("../models/BatchSession");
const BatchSubstitution = require("../models/BatchSubstitution");
const StudentEntryAttendance = require("../models/StudentEntryAttendance");
const { markAttendanceForAdmission } = require("./attendanceController");
const { sendOtpEmail } = require("../utils/mailer");
const { isSectionActiveToday, SECTION_LABELS } = require("../utils/sections");
const { parseTimeRange } = require("../utils/timeRange");

// Which of a batch's students already got credit for `topic` before today
// (class attendance AND campus entry attendance both true on some earlier
// date this exact topic was covered in this batch) — they've already
// completed it and don't need to be marked present again for a repeat.
const getStudentsAlreadyCompletedTopic = async (batchId, topic, todayStr, studentIds) => {
  if (!topic || !studentIds.length) return new Set();
  const pastSessions = await BatchSession.findAll({
    where: { batch_id: batchId, topic_covered: topic, date: { [Op.ne]: todayStr } },
  });
  if (!pastSessions.length) return new Set();
  const pastDates = pastSessions.map((s) => s.date);
  const classAttendance = await Attendance.findAll({
    where: { batch_id: batchId, admission_id: studentIds, date: pastDates },
  });
  const entryAttendance = await StudentEntryAttendance.findAll({
    where: { admission_id: studentIds, date: pastDates },
  });
  const entryByAdmission = new Map();
  entryAttendance.forEach((e) => {
    if (!entryByAdmission.has(e.admission_id)) entryByAdmission.set(e.admission_id, new Set());
    entryByAdmission.get(e.admission_id).add(e.date);
  });
  const completed = new Set();
  studentIds.forEach((id) => {
    const entryDates = entryByAdmission.get(id) || new Set();
    const done = pastDates.some(
      (d) => entryDates.has(d) && classAttendance.some((a) => a.admission_id === id && a.date === d)
    );
    if (done) completed.add(id);
  });
  return completed;
};

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

const generateTeacherToken = (teacher) =>
  jwt.sign(
    {
      teacherId: teacher.id,
      email: teacher.email,
      admin_id: teacher.admin_id,
      role: "teacher",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const setTeacherAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("teacher_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearTeacherAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("teacher_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
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

    // is_verified only marks that this teacher has completed onboarding —
    // it's a permanent DB flag, not proof that *this* visitor verified.
    // Issue the same session cookie the general login flow uses, so that
    // dashboard/action endpoints can require an actual proven session
    // instead of trusting anyone who has the slug URL.
    const token = generateTeacherToken(teacher);
    setTeacherAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Verified successfully",
      data: { slug: teacher.slug, teacher_name: teacher.teacher_name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Email + OTP login (separate from the slug-link flow above) ---
// This is the general "Teacher Login" page: teacher enters their email
// instead of needing a personal secret link, and a cookie session is
// established so a proper Logout is possible.

const loginRequestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    const teacher = await Teacher.findOne({
      where: { email: { [Op.iLike]: email.trim() }, active: true },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "No teacher account found with this email.",
      });
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

const loginVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });
    }

    const teacher = await Teacher.findOne({
      where: { email: { [Op.iLike]: email.trim() }, active: true },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "No teacher account found with this email.",
      });
    }

    if (
      !teacher.otp ||
      teacher.otp !== otp ||
      !teacher.otp_expires ||
      new Date() > new Date(teacher.otp_expires)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    await teacher.update({ is_verified: true, otp: null, otp_expires: null });

    const token = generateTeacherToken(teacher);
    setTeacherAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { teacher_name: teacher.teacher_name, slug: teacher.slug },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const teacherLogout = (req, res) => {
  clearTeacherAuthCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

const getTeacherMe = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      where: { id: req.teacher.teacherId, active: true },
      attributes: ["id", "teacher_name", "email", "slug"],
    });
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found." });
    }
    res.status(200).json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const { slug } = req.params;
    const teacher = await Teacher.findOne({
      where: { slug, active: true, id: req.teacher.teacherId },
      include: [{ model: Course, through: { attributes: [] } }],
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const teacherCourseIds = (teacher.Courses || []).map((c) => c.id);
    const coursesWithSubjects = teacherCourseIds.length
      ? await Course.findAll({
          where: { id: teacherCourseIds },
          include: [
            {
              model: Subject,
              through: { attributes: [] },
              include: [
                { model: Subject, as: "Parent" },
                {
                  model: Subject,
                  as: "SubSubjects",
                  where: { active: true },
                  required: false,
                },
              ],
            },
          ],
        })
      : [];
    const courseSyllabus = coursesWithSubjects.map((c) => {
      const flat = c.Subjects || [];
      const flatIds = new Set(flat.map((s) => s.id));
      const topLevel = flat.filter((s) => !s.parent_id);
      const subOnly = flat.filter((s) => s.parent_id);
      const subjects = topLevel.map((s) => {
        // Sub-subjects individually linked to this course...
        const individuallyLinked = subOnly.filter(
          (sub) => sub.parent_id === s.id
        );
        const individuallyLinkedIds = new Set(
          individuallyLinked.map((sub) => sub.id)
        );
        // ...plus the rest of the parent's own sub-subjects — selecting a
        // parent implies all of its children, even if the course was only
        // ever linked to the parent's row (which usually has no syllabus
        // of its own; the real content lives on the children).
        const restOfChildren = (s.SubSubjects || []).filter(
          (sub) => !individuallyLinkedIds.has(sub.id)
        );
        return {
          id: s.id,
          subject_name: s.subject_name,
          description: s.description,
          syllabus: s.syllabus,
          parent_name: null,
          subSubjects: [...individuallyLinked, ...restOfChildren].map(
            (sub) => ({
              id: sub.id,
              subject_name: sub.subject_name,
              description: sub.description,
              syllabus: sub.syllabus,
            })
          ),
        };
      });
      // Sub-subjects whose parent wasn't itself linked to this course —
      // show them standalone, tagged with their parent's name for context.
      subOnly
        .filter((sub) => !flatIds.has(sub.parent_id))
        .forEach((sub) => {
          subjects.push({
            id: sub.id,
            subject_name: sub.subject_name,
            description: sub.description,
            syllabus: sub.syllabus,
            parent_name: sub.Parent?.subject_name || null,
            subSubjects: [],
          });
        });
      return {
        course_id: c.id,
        course_name: c.course_name,
        subjects,
      };
    });

    const groups = await Group.findAll({
      where: { teacher_id: teacher.id, active: true },
      include: [
        { model: Course },
        { model: Admission, as: "Students", through: { attributes: [] } },
      ],
    });
    const groupIds = groups.map((g) => g.id);
    const groupsById = new Map(groups.map((g) => [g.id, g]));

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });
    const upcomingHolidays = await Holiday.findAll({
      where: { date: { [Op.gt]: todayStr } },
      order: [["date", "ASC"]],
      limit: 5,
    });
    const myAvailability = await TeacherAvailability.findOne({
      where: { teacher_id: teacher.id, date: todayStr },
    });

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
    const todaySlotsOwn = todayHoliday
      ? []
      : allSlots
          .filter((s) => s.day_of_week === today)
          .sort(
            (a, b) => parseStartMinutes(a.timing) - parseStartMinutes(b.timing)
          );

    // Slots that belong to me but are being covered by another teacher today
    const ownSlotIdsToday = todaySlotsOwn.map((s) => s.id);
    const coveringSubs = ownSlotIdsToday.length
      ? await SlotSubstitution.findAll({
          where: { weekly_schedule_slot_id: ownSlotIdsToday, date: todayStr },
          include: [{ model: Teacher, as: "SubstituteTeacher" }],
        })
      : [];
    const coveredBySlotId = new Map(
      coveringSubs.map((s) => [s.weekly_schedule_slot_id, s])
    );

    // Slots belonging to OTHER teachers where I'm covering as a substitute today
    // (only counts if that slot is part of the currently-ON weekly schedule)
    const subbedInRows =
      !todayHoliday && activeSchedule
        ? await SlotSubstitution.findAll({
            where: { substitute_teacher_id: teacher.id, date: todayStr },
            include: [
              {
                model: WeeklyScheduleSlot,
                where: { weekly_schedule_id: activeSchedule.id },
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
          })
        : [];
    const subbedInSlots = subbedInRows
      .map((r) => r.WeeklyScheduleSlot)
      .filter((s) => s && s.day_of_week === today);

    const combinedTodaySlots = [
      ...todaySlotsOwn.map((s) => ({
        slot: s,
        group: groupsById.get(s.group_id),
        isSubstitute: false,
        coveredBy:
          coveredBySlotId.get(s.id)?.SubstituteTeacher?.teacher_name || null,
      })),
      ...subbedInSlots.map((s) => ({
        slot: s,
        group: s.Group,
        isSubstitute: true,
        coveredBy: null,
      })),
    ].sort(
      (a, b) => parseStartMinutes(a.slot.timing) - parseStartMinutes(b.slot.timing)
    );

    const todaySlotIds = combinedTodaySlots.map((x) => x.slot.id);
    const attendedToday = todaySlotIds.length
      ? await Attendance.findAll({
          where: {
            date: todayStr,
            weekly_schedule_slot_id: todaySlotIds,
          },
        })
      : [];
    // key = `${slotId}-${admissionId}` so presence is scoped to this specific
    // class session, not shared across other slots for the same group/day
    const attendedBySlot = new Set(
      attendedToday.map((a) => `${a.weekly_schedule_slot_id}-${a.admission_id}`)
    );

    const classSessionsToday = todaySlotIds.length
      ? await ClassSession.findAll({
          where: { weekly_schedule_slot_id: todaySlotIds, date: todayStr },
        })
      : [];
    const sessionBySlot = new Map(
      classSessionsToday.map((s) => [s.weekly_schedule_slot_id, s])
    );

    // Concept 2 — Batches assigned to this teacher whose section runs today.
    const myBatches = await Batch.findAll({
      where: { teacher_id: teacher.id, admin_id: teacher.admin_id, active: true },
      include: [
        { model: Subject, attributes: ["id", "subject_name"] },
        { model: Admission, as: "Students", through: { attributes: [] } },
      ],
    });
    const myBatchesToday = myBatches.filter((b) => isSectionActiveToday(b.section));

    // Batches of mine being covered by another teacher today
    const myBatchIdsToday = myBatchesToday.map((b) => b.id);
    const coveringBatchSubs = myBatchIdsToday.length
      ? await BatchSubstitution.findAll({
          where: { batch_id: myBatchIdsToday, date: todayStr },
          include: [{ model: Teacher, as: "SubstituteTeacher" }],
        })
      : [];
    const coveredByBatch = new Map(
      coveringBatchSubs.map((s) => [s.batch_id, s])
    );

    // Other teachers' batches where I'm covering as a substitute today
    const subbedInBatchRows = !todayHoliday
      ? await BatchSubstitution.findAll({
          where: { substitute_teacher_id: teacher.id, date: todayStr },
          include: [
            {
              model: Batch,
              where: { admin_id: teacher.admin_id, active: true },
              include: [
                { model: Subject, attributes: ["id", "subject_name"] },
                { model: Admission, as: "Students", through: { attributes: [] } },
              ],
            },
          ],
        })
      : [];
    const subbedInBatches = subbedInBatchRows
      .map((r) => r.Batch)
      .filter((b) => b && isSectionActiveToday(b.section));

    const combinedTodayBatches = todayHoliday
      ? []
      : [
          ...myBatchesToday.map((b) => ({
            batch: b,
            isSubstitute: false,
            coveredBy: coveredByBatch.get(b.id)?.SubstituteTeacher?.teacher_name || null,
          })),
          ...subbedInBatches.map((b) => ({
            batch: b,
            isSubstitute: true,
            coveredBy: null,
          })),
        ];

    const todayBatchIds = combinedTodayBatches.map((x) => x.batch.id);
    const batchSessionsToday = todayBatchIds.length
      ? await BatchSession.findAll({
          where: { batch_id: todayBatchIds, date: todayStr },
        })
      : [];
    const sessionByBatch = new Map(
      batchSessionsToday.map((s) => [s.batch_id, s])
    );

    const attendedBatchToday = todayBatchIds.length
      ? await Attendance.findAll({
          where: { date: todayStr, batch_id: todayBatchIds },
        })
      : [];
    const attendedByBatch = new Set(
      attendedBatchToday.map((a) => `${a.batch_id}-${a.admission_id}`)
    );

    // If today's session already has a topic locked in (teacher picked a
    // repeat topic when starting class), students who already completed
    // that exact topic before shouldn't be shown in the mark-present list.
    const excludedByBatch = new Map(
      await Promise.all(
        combinedTodayBatches.map(async ({ batch: b }) => {
          const topic = sessionByBatch.get(b.id)?.topic_covered;
          const studentIds = (b.Students || []).map((s) => s.id);
          const excluded = await getStudentsAlreadyCompletedTopic(
            b.id,
            topic,
            todayStr,
            studentIds
          );
          return [b.id, excluded];
        })
      )
    );

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          teacher_name: teacher.teacher_name,
          qualification: teacher.qualification,
          courses: (teacher.Courses || []).map((c) => c.course_name),
        },
        courseSyllabus,
        holiday: todayHoliday
          ? { date: todayHoliday.date, description: todayHoliday.description }
          : null,
        upcomingHolidays: upcomingHolidays.map((h) => ({
          date: h.date,
          description: h.description,
        })),
        my_availability: myAvailability
          ? { reason: myAvailability.reason }
          : null,
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
        todayClasses: combinedTodaySlots.map(({ slot, group, isSubstitute, coveredBy }) => ({
          id: slot.id,
          group_id: slot.group_id,
          group_name: slot.Group?.group_name || group?.group_name,
          course_name: (slot.Group?.Course || group?.Course)?.course_name,
          timing: slot.timing,
          is_substitute: isSubstitute,
          covered_by: coveredBy,
          started_at: sessionBySlot.get(slot.id)?.started_at || null,
          ended_at: sessionBySlot.get(slot.id)?.ended_at || null,
          topic_covered: sessionBySlot.get(slot.id)?.topic_covered || null,
          students: (group?.Students || []).map((student) => ({
            id: student.id,
            applicant_name: student.applicant_name,
            comn_enrol_no: student.comn_enrol_no,
            already_present: attendedBySlot.has(`${slot.id}-${student.id}`),
          })),
        })),
        allSlots: allSlots.map((s) => ({
          id: s.id,
          day_of_week: s.day_of_week,
          group_id: s.group_id,
          group_name: s.Group?.group_name,
          timing: s.timing,
        })),
        todayBatches: combinedTodayBatches.map(({ batch: b, isSubstitute, coveredBy }) => {
          const session = sessionByBatch.get(b.id);
          const excludedIds = excludedByBatch.get(b.id) || new Set();
          const allStudents = b.Students || [];
          return {
            id: b.id,
            batch_name: b.batch_name,
            section: b.section,
            section_label: SECTION_LABELS[b.section] || b.section,
            subject_name: b.Subject?.subject_name || null,
            timing: b.timing,
            num_days: b.num_days,
            is_substitute: isSubstitute,
            covered_by: coveredBy,
            started_at: session?.started_at || null,
            ended_at: session?.ended_at || null,
            topic_covered: session?.topic_covered || null,
            students: allStudents
              .filter((s) => !excludedIds.has(s.id))
              .map((s) => ({
                id: s.id,
                applicant_name: s.applicant_name,
                comn_enrol_no: s.comn_enrol_no,
                already_present: attendedByBatch.has(`${b.id}-${s.id}`),
              })),
            alreadyCompletedStudents: allStudents
              .filter((s) => excludedIds.has(s.id))
              .map((s) => ({ id: s.id, applicant_name: s.applicant_name })),
          };
        }),
        myBatches: myBatches.map((b) => ({
          id: b.id,
          batch_name: b.batch_name,
          section: b.section,
          section_label: SECTION_LABELS[b.section] || b.section,
          subject_name: b.Subject?.subject_name || null,
          timing: b.timing,
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
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });
    if (todayHoliday) {
      return res.status(403).json({
        success: false,
        message: `Today is a holiday${todayHoliday.description ? ` (${todayHoliday.description})` : ""} — attendance cannot be marked.`,
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

    let slotId = null;
    if (weekly_schedule_slot_id) {
      const slot = await WeeklyScheduleSlot.findByPk(weekly_schedule_slot_id, {
        include: [
          {
            model: Group,
            include: [
              { model: Admission, as: "Students", through: { attributes: [] } },
            ],
          },
        ],
      });
      if (!slot) {
        return res
          .status(404)
          .json({ success: false, message: "Class not found" });
      }

      const isOwnGroup = groupIds.includes(slot.group_id);
      const substitution = await SlotSubstitution.findOne({
        where: { weekly_schedule_slot_id: slot.id, date: todayStr },
      });
      const isAssignedSubstitute =
        substitution?.substitute_teacher_id === teacher.id;

      if (!isOwnGroup && !isAssignedSubstitute) {
        return res.status(403).json({
          success: false,
          message: "This class is not one of your assigned groups",
        });
      }
      if (isOwnGroup && substitution && !isAssignedSubstitute) {
        return res.status(403).json({
          success: false,
          message:
            "A substitute teacher is covering this class today — attendance should be marked by them.",
        });
      }
      if (isAssignedSubstitute) {
        (slot.Group?.Students || []).forEach((s) =>
          allowedAdmissionIds.add(s.id)
        );
      }
      slotId = slot.id;
    }

    if (!allowedAdmissionIds.has(Number(admission_id))) {
      return res.status(403).json({
        success: false,
        message: "This student is not in your assigned groups",
      });
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

// Concept 2 equivalent of markAttendance — same rules (own batch, or
// today's assigned substitute), attendance keyed by batch_id instead of
// weekly_schedule_slot_id.
const markBatchAttendance = async (req, res) => {
  try {
    const { slug, admission_id, batch_id } = req.body;
    if (!batch_id) {
      return res.status(400).json({ success: false, message: "Batch is required." });
    }
    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found or not verified" });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });
    if (todayHoliday) {
      return res.status(403).json({
        success: false,
        message: `Today is a holiday${todayHoliday.description ? ` (${todayHoliday.description})` : ""} — attendance cannot be marked.`,
      });
    }

    const batch = await Batch.findByPk(batch_id, {
      include: [{ model: Admission, as: "Students", through: { attributes: [] } }],
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const isOwnBatch = batch.teacher_id === teacher.id;
    const substitution = await BatchSubstitution.findOne({
      where: { batch_id: batch.id, date: todayStr },
    });
    const isAssignedSubstitute = substitution?.substitute_teacher_id === teacher.id;

    if (!isOwnBatch && !isAssignedSubstitute) {
      return res.status(403).json({ success: false, message: "This is not one of your assigned batches" });
    }
    if (isOwnBatch && substitution && !isAssignedSubstitute) {
      return res.status(403).json({
        success: false,
        message: "A substitute teacher is covering this batch today — attendance should be marked by them.",
      });
    }

    const allowedAdmissionIds = new Set((batch.Students || []).map((s) => s.id));
    if (!allowedAdmissionIds.has(Number(admission_id))) {
      return res.status(403).json({ success: false, message: "This student is not in this batch" });
    }

    const admission = await Admission.findByPk(admission_id);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const result = await markAttendanceForAdmission(admission, null, batch.id);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markUnavailableToday = async (req, res) => {
  try {
    const { slug, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please tell us the reason.",
      });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const [rec, created] = await TeacherAvailability.findOrCreate({
      where: { teacher_id: teacher.id, date: todayStr },
      defaults: { reason: reason.trim() },
    });
    if (!created) {
      await rec.update({ reason: reason.trim() });
    }

    res.status(200).json({
      success: true,
      message: "Marked as not available for today",
      data: rec,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAvailableToday = async (req, res) => {
  try {
    const { slug } = req.body;
    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    await TeacherAvailability.destroy({
      where: { teacher_id: teacher.id, date: todayStr },
    });

    res.status(200).json({
      success: true,
      message: "Marked as available for today",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const startClass = async (req, res) => {
  try {
    const { slug, weekly_schedule_slot_id } = req.body;
    if (!weekly_schedule_slot_id) {
      return res
        .status(400)
        .json({ success: false, message: "Class is required." });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });
    if (todayHoliday) {
      return res.status(403).json({
        success: false,
        message: "Today is a holiday — no classes today.",
      });
    }

    const slot = await WeeklyScheduleSlot.findByPk(weekly_schedule_slot_id);
    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const groups = await Group.findAll({
      where: { teacher_id: teacher.id, active: true },
    });
    const groupIds = groups.map((g) => g.id);
    const isOwnGroup = groupIds.includes(slot.group_id);

    const substitution = await SlotSubstitution.findOne({
      where: { weekly_schedule_slot_id: slot.id, date: todayStr },
    });
    const isAssignedSubstitute =
      substitution?.substitute_teacher_id === teacher.id;

    if (!isOwnGroup && !isAssignedSubstitute) {
      return res.status(403).json({
        success: false,
        message: "This class is not one of your assigned groups",
      });
    }
    if (isOwnGroup && substitution && !isAssignedSubstitute) {
      return res.status(403).json({
        success: false,
        message: "A substitute teacher is covering this class today.",
      });
    }

    const [session] = await ClassSession.findOrCreate({
      where: { weekly_schedule_slot_id: slot.id, date: todayStr },
      defaults: { teacher_id: teacher.id, started_at: new Date() },
    });

    res.status(200).json({
      success: true,
      message: "Class started",
      data: { started_at: session.started_at },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const endClass = async (req, res) => {
  try {
    const { slug, weekly_schedule_slot_id, topic_covered } = req.body;
    if (!weekly_schedule_slot_id) {
      return res
        .status(400)
        .json({ success: false, message: "Class is required." });
    }
    if (!topic_covered || !topic_covered.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter the topic covered today before ending the class.",
      });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or not verified",
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const slot = await WeeklyScheduleSlot.findByPk(weekly_schedule_slot_id);
    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const groups = await Group.findAll({
      where: { teacher_id: teacher.id, active: true },
    });
    const groupIds = groups.map((g) => g.id);
    const isOwnGroup = groupIds.includes(slot.group_id);

    const substitution = await SlotSubstitution.findOne({
      where: { weekly_schedule_slot_id: slot.id, date: todayStr },
    });
    const isAssignedSubstitute =
      substitution?.substitute_teacher_id === teacher.id;

    if (!isOwnGroup && !isAssignedSubstitute) {
      return res.status(403).json({
        success: false,
        message: "This class is not one of your assigned groups",
      });
    }
    if (isOwnGroup && substitution && !isAssignedSubstitute) {
      return res.status(403).json({
        success: false,
        message: "A substitute teacher is covering this class today.",
      });
    }

    const session = await ClassSession.findOne({
      where: { weekly_schedule_slot_id: slot.id, date: todayStr },
    });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Start the class first before ending it.",
      });
    }
    if (!session.ended_at) {
      await session.update({
        ended_at: new Date(),
        topic_covered: topic_covered.trim(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Class ended",
      data: { ended_at: session.ended_at, topic_covered: session.topic_covered },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Concept 2 — start/end a Batch's class session for today. Simpler than
// startClass/endClass: batches belong to exactly one teacher, no substitute
// concept here yet.
const startBatch = async (req, res) => {
  try {
    const { slug, batch_id, topic_covered } = req.body;
    if (!batch_id) {
      return res.status(400).json({ success: false, message: "Batch is required." });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found or not verified" });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayHoliday = await Holiday.findOne({ where: { date: todayStr } });
    if (todayHoliday) {
      return res.status(403).json({ success: false, message: "Today is a holiday — no classes today." });
    }

    const batch = await Batch.findOne({ where: { id: batch_id, active: true } });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (batch.teacher_id !== teacher.id) {
      return res.status(403).json({ success: false, message: "This batch is not assigned to you" });
    }

    const range = parseTimeRange(batch.timing);
    if (range) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes < range.startMinutes || nowMinutes > range.endMinutes) {
        return res.status(403).json({
          success: false,
          message: `You can only start this class during its scheduled time (${batch.timing}). It is not that time right now.`,
        });
      }
    }

    const [session] = await BatchSession.findOrCreate({
      where: { batch_id: batch.id, date: todayStr },
      defaults: {
        teacher_id: teacher.id,
        started_at: new Date(),
        topic_covered: topic_covered && topic_covered.trim() ? topic_covered.trim() : null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Class started",
      data: { started_at: session.started_at, topic_covered: session.topic_covered },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const endBatch = async (req, res) => {
  try {
    const { slug, batch_id, topic_covered } = req.body;
    if (!batch_id) {
      return res.status(400).json({ success: false, message: "Batch is required." });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found or not verified" });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const batch = await Batch.findOne({
      where: { id: batch_id, active: true },
      include: [{ model: Admission, as: "Students", through: { attributes: [] } }],
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (batch.teacher_id !== teacher.id) {
      return res.status(403).json({ success: false, message: "This batch is not assigned to you" });
    }

    const session = await BatchSession.findOne({
      where: { batch_id: batch.id, date: todayStr },
    });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Start the class first before ending it.",
      });
    }

    // A repeat topic picked at Start Class is already locked in on the
    // session — no need to ask again. A brand-new topic still needs to be
    // typed now, same as before.
    const finalTopic = session.topic_covered || (topic_covered && topic_covered.trim());
    if (!finalTopic) {
      return res.status(400).json({
        success: false,
        message: "Please enter the topic covered today before ending the class.",
      });
    }

    if (!session.ended_at) {
      const studentIds = (batch.Students || []).map((s) => s.id);
      const excluded = await getStudentsAlreadyCompletedTopic(
        batch.id,
        session.topic_covered,
        todayStr,
        studentIds
      );
      const eligibleCount = studentIds.length - excluded.size;
      if (eligibleCount > 0) {
        const presentCount = await Attendance.count({
          where: { batch_id: batch.id, date: todayStr },
        });
        if (presentCount === 0) {
          return res.status(400).json({
            success: false,
            message: "Mark at least one student present before ending the class.",
          });
        }
      }
      await session.update({ ended_at: new Date(), topic_covered: finalTopic });
    }

    res.status(200).json({
      success: true,
      message: "Class ended",
      data: { ended_at: session.ended_at, topic_covered: session.topic_covered },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Voids today's session when nobody showed up — End Class stays blocked
// with zero attendance marked, so this is the escape hatch for that case.
// Refuses once anyone's been marked present (end the class instead) so it
// can never quietly drop real attendance data.
const cancelBatch = async (req, res) => {
  try {
    const { slug, batch_id } = req.body;
    if (!batch_id) {
      return res.status(400).json({ success: false, message: "Batch is required." });
    }

    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found or not verified" });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const batch = await Batch.findOne({ where: { id: batch_id, active: true } });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (batch.teacher_id !== teacher.id) {
      return res.status(403).json({ success: false, message: "This batch is not assigned to you" });
    }

    const session = await BatchSession.findOne({
      where: { batch_id: batch.id, date: todayStr },
    });
    if (!session) {
      return res.status(400).json({ success: false, message: "This class hasn't been started." });
    }
    if (session.ended_at) {
      return res.status(400).json({ success: false, message: "This class has already ended." });
    }

    const presentCount = await Attendance.count({
      where: { batch_id: batch.id, date: todayStr },
    });
    if (presentCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance has already been marked — end the class instead of cancelling.",
      });
    }

    await session.destroy();

    res.status(200).json({ success: true, message: "Class cancelled — nobody was marked present." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Topics already covered in this batch — shown as suggestions when
// starting class, so the teacher can pick a repeat instead of retyping it.
const getBatchTopicSuggestions = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findOne({
      where: { id: batchId, teacher_id: req.teacher.teacherId, active: true },
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    const sessions = await BatchSession.findAll({
      where: { batch_id: batch.id, topic_covered: { [Op.ne]: null } },
      order: [["date", "DESC"]],
    });
    const topics = [...new Set(sessions.map((s) => s.topic_covered))];
    res.status(200).json({ success: true, data: topics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Concept 2 — full progress view for every batch this teacher has (not just
// today's): covered topics with per-session attendance, and whether the
// batch is on track to finish within its num_days target.
const getBatchProgress = async (req, res) => {
  try {
    const { slug } = req.params;
    const teacher = await Teacher.findOne({
      where: { slug, active: true, is_verified: true, id: req.teacher.teacherId },
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found or not verified" });
    }

    const batches = await Batch.findAll({
      where: { teacher_id: teacher.id, admin_id: teacher.admin_id, active: true },
      include: [
        { model: Subject, attributes: ["subject_name"] },
        { model: Admission, as: "Students", through: { attributes: [] } },
      ],
      order: [["id", "ASC"]],
    });

    const batchIds = batches.map((b) => b.id);
    const sessions = batchIds.length
      ? await BatchSession.findAll({
          where: { batch_id: batchIds, topic_covered: { [Op.ne]: null } },
          order: [["date", "ASC"]],
        })
      : [];
    const attendanceRows = batchIds.length
      ? await Attendance.findAll({ where: { batch_id: batchIds } })
      : [];

    const data = batches.map((b) => {
      const students = (b.Students || []).map((s) => ({
        id: s.id,
        applicant_name: s.applicant_name,
        comn_enrol_no: s.comn_enrol_no,
      }));
      const batchSessions = sessions.filter((s) => s.batch_id === b.id);
      const sessionDetails = batchSessions.map((s) => {
        const presentIds = new Set(
          attendanceRows
            .filter((a) => a.batch_id === b.id && a.date === s.date)
            .map((a) => a.admission_id)
        );
        const present = students.filter((st) => presentIds.has(st.id));
        const absent = students.filter((st) => !presentIds.has(st.id));
        return {
          date: s.date,
          topic_covered: s.topic_covered,
          present,
          absent,
          presentCount: present.length,
          absentCount: absent.length,
        };
      });

      const daysCompleted = batchSessions.length;
      const daysRemaining = b.num_days ? b.num_days - daysCompleted : null;

      return {
        id: b.id,
        batch_name: b.batch_name,
        subject_name: b.Subject?.subject_name || null,
        section: b.section,
        section_label: SECTION_LABELS[b.section] || b.section,
        timing: b.timing,
        num_days: b.num_days,
        students,
        sessions: sessionDetails,
        daysCompleted,
        daysRemaining,
        isNearingDeadline:
          b.num_days != null && daysRemaining !== null && daysRemaining <= 1 && daysRemaining >= 0,
        isOverdue: b.num_days != null && daysRemaining !== null && daysRemaining < 0,
        subjectCompleted: b.subject_completed,
        subjectCompletedAt: b.subject_completed_at,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Teacher declares "I've covered every topic for this subject in this
// batch" — there's no master topic checklist to verify against (topics are
// free text per session), so this is their own call, surfaced to admin's
// Student Tracking page as the batch's official completion status.
const markSubjectComplete = async (req, res) => {
  try {
    const { batch_id } = req.body;
    const batch = await Batch.findOne({
      where: { id: batch_id, teacher_id: req.teacher.teacherId, active: true },
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    await batch.update({ subject_completed: true, subject_completed_at: new Date() });
    res.status(200).json({
      success: true,
      message: "Subject marked as completed for this batch.",
      data: { subjectCompleted: true, subjectCompletedAt: batch.subject_completed_at },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unmarkSubjectComplete = async (req, res) => {
  try {
    const { batch_id } = req.body;
    const batch = await Batch.findOne({
      where: { id: batch_id, teacher_id: req.teacher.teacherId, active: true },
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    await batch.update({ subject_completed: false, subject_completed_at: null });
    res.status(200).json({
      success: true,
      message: "Subject completion undone.",
      data: { subjectCompleted: false, subjectCompletedAt: null },
    });
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
  markBatchAttendance,
  markUnavailableToday,
  markAvailableToday,
  startClass,
  endClass,
  startBatch,
  endBatch,
  getBatchProgress,
  markSubjectComplete,
  unmarkSubjectComplete,
  getBatchTopicSuggestions,
  cancelBatch,
  loginRequestOtp,
  loginVerifyOtp,
  teacherLogout,
  getTeacherMe,
};
