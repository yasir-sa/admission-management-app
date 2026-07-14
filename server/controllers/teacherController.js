const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
require("../models/TeacherCourse");

const STATUSES = ["Active", "Inactive"];

const validateTeacherPayload = (body) => {
  const errors = {};

  if (!body.teacher_name || !body.teacher_name.trim()) {
    errors.teacher_name = "Teacher Name is required.";
  }

  if (
    body.salary !== undefined &&
    body.salary !== null &&
    body.salary !== "" &&
    Number(body.salary) < 0
  ) {
    errors.salary = "Salary cannot be negative.";
  }

  if (body.status && !STATUSES.includes(body.status)) {
    errors.status = "Invalid teacher status.";
  }

  return errors;
};

const buildPayload = (body) => ({
  teacher_name: body.teacher_name,
  mobile_no: body.mobile_no || null,
  email: body.email || null,
  qualification: body.qualification || null,
  joining_date: body.joining_date || null,
  salary: body.salary === "" || body.salary === undefined ? null : body.salary,
  status: body.status || "Active",
});

const createTeacher = async (req, res) => {
  try {
    const errors = validateTeacherPayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const teacher = await Teacher.create(buildPayload(req.body));
    res.status(201).json({
      success: true,
      message: "Teacher added successfully",
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllTeachers = async (req, res) => {
  try {
    const isActive = req.query.active !== "false";
    const teachers = await Teacher.findAll({
      where: { active: isActive },
      include: [{ model: Course, through: { attributes: [] } }],
      order: [["id", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const errors = validateTeacherPayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    await teacher.update(buildPayload(req.body));
    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }
    await teacher.update({ active: false });
    res.status(200).json({
      success: true,
      message: "Teacher removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const restoreTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }
    await teacher.update({ active: true });
    res.status(200).json({
      success: true,
      message: "Teacher restored successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const setTeacherCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { course_ids } = req.body;
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }
    await teacher.setCourses(course_ids || []);
    const updated = await Teacher.findByPk(id, {
      include: [{ model: Course, through: { attributes: [] } }],
    });
    res.status(200).json({
      success: true,
      message: "Teacher courses updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  setTeacherCourses,
};
