const Subject = require("../models/Subject");

const getAllSubjects = async (req, res) => {
  try {
    const isActive = req.query.active !== "false";
    const subjects = await Subject.findAll({
      where: { active: isActive, parent_id: null },
      include: [
        {
          model: Subject,
          as: "SubSubjects",
          where: { active: true },
          required: false,
        },
      ],
      order: [["id", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createSubject = async (req, res) => {
  try {
    const { subject_name, description, syllabus, parent_id } = req.body;
    if (!subject_name || !subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errors: { subject_name: "Subject Name is required." },
      });
    }
    if (parent_id) {
      const parent = await Subject.findByPk(parent_id);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent subject not found",
        });
      }
    }
    const subject = await Subject.create({
      subject_name,
      description: description || null,
      syllabus: syllabus || null,
      parent_id: parent_id || null,
    });
    res.status(201).json({
      success: true,
      message: parent_id
        ? "Sub-Subject added successfully"
        : "Subject added successfully",
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    const { subject_name, description, syllabus } = req.body;
    if (!subject_name || !subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errors: { subject_name: "Subject Name is required." },
      });
    }
    await subject.update({
      subject_name,
      description: description || null,
      syllabus: syllabus || null,
    });
    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    await subject.update({ active: false });
    res.status(200).json({
      success: true,
      message: "Subject removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const restoreSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    await subject.update({ active: true });
    res.status(200).json({
      success: true,
      message: "Subject restored successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
};
