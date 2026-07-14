const Group = require("../models/Group");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const Admission = require("../models/Admission");
require("../models/GroupStudent");

const includeOptions = [
  {
    model: Teacher,
    include: [{ model: Course, through: { attributes: [] } }],
  },
  { model: Course },
  { model: Admission, as: "Students", through: { attributes: [] } },
];

const createGroup = async (req, res) => {
  try {
    const { group_name, teacher_id, course_id } = req.body;
    const errors = {};
    if (!group_name || !group_name.trim()) {
      errors.group_name = "Group Name is required.";
    }
    if (!teacher_id) {
      errors.teacher_id = "Teacher is required.";
    }
    if (!course_id) {
      errors.course_id = "Course is required.";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const group = await Group.create({ group_name, teacher_id, course_id });
    res.status(201).json({
      success: true,
      message: "Group added successfully",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllGroups = async (req, res) => {
  try {
    const isActive = req.query.active !== "false";
    const groups = await Group.findAll({
      where: { active: isActive },
      include: includeOptions,
      order: [["id", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { group_name, teacher_id, course_id } = req.body;
    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const errors = {};
    if (!group_name || !group_name.trim()) {
      errors.group_name = "Group Name is required.";
    }
    if (!teacher_id) {
      errors.teacher_id = "Teacher is required.";
    }
    if (!course_id) {
      errors.course_id = "Course is required.";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    await group.update({ group_name, teacher_id, course_id });
    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    await group.update({ active: false });
    res.status(200).json({
      success: true,
      message: "Group removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const restoreGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    await group.update({ active: true });
    res.status(200).json({
      success: true,
      message: "Group restored successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const setGroupStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { admission_ids } = req.body;
    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    await group.setStudents(admission_ids || []);
    const updated = await Group.findByPk(id, { include: includeOptions });
    res.status(200).json({
      success: true,
      message: "Group students updated successfully",
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
  createGroup,
  getAllGroups,
  updateGroup,
  deleteGroup,
  restoreGroup,
  setGroupStudents,
};
