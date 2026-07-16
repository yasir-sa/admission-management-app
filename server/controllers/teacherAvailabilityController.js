const Teacher = require("../models/Teacher");
const TeacherAvailability = require("../models/TeacherAvailability");

const getTodayStatus = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const teachers = await Teacher.findAll({
      where: { active: true },
      order: [["teacher_name", "ASC"]],
    });
    const unavailableRecords = await TeacherAvailability.findAll({
      where: { date: todayStr },
    });
    const unavailableMap = new Map(
      unavailableRecords.map((rec) => [rec.teacher_id, rec])
    );

    const available = [];
    const nonAvailable = [];
    teachers.forEach((t) => {
      const rec = unavailableMap.get(t.id);
      if (rec) {
        nonAvailable.push({
          id: t.id,
          teacher_name: t.teacher_name,
          reason: rec.reason,
        });
      } else {
        available.push({ id: t.id, teacher_name: t.teacher_name });
      }
    });

    res.status(200).json({
      success: true,
      data: { date: todayStr, available, nonAvailable },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getTodayStatus };
