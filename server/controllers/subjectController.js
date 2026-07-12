const Subject = require("../models/Subject");
const SubSubject = require("../models/SubSubject");

const getAllSubjects = async (req, res) => {
  try {
    const isActive = req.query.active !== "false";
    const subjects = await Subject.findAll({
      where: { active: isActive },
      include: [{ model: SubSubject, where: { active: true }, required: false }],
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
    const { subject_name, description, syllabus } = req.body;
    if (!subject_name || !subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errors: { subject_name: "Subject Name is required." },
      });
    }
    const subject = await Subject.create({
      subject_name,
      description: description || null,
      syllabus: syllabus || null,
    });
    res.status(201).json({
      success: true,
      message: "Subject added successfully",
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

const createSubSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    const { sub_subject_name, syllabus } = req.body;
    if (!sub_subject_name || !sub_subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errors: { sub_subject_name: "Sub-Subject Name is required." },
      });
    }
    const subSubject = await SubSubject.create({
      subject_id: subjectId,
      sub_subject_name,
      syllabus: syllabus || null,
    });
    res.status(201).json({
      success: true,
      message: "Sub-Subject added successfully",
      data: subSubject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSubSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subSubject = await SubSubject.findByPk(id);
    if (!subSubject) {
      return res.status(404).json({
        success: false,
        message: "Sub-Subject not found",
      });
    }
    const { sub_subject_name, syllabus } = req.body;
    if (!sub_subject_name || !sub_subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errors: { sub_subject_name: "Sub-Subject Name is required." },
      });
    }
    await subSubject.update({
      sub_subject_name,
      syllabus: syllabus || null,
    });
    res.status(200).json({
      success: true,
      message: "Sub-Subject updated successfully",
      data: subSubject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSubSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subSubject = await SubSubject.findByPk(id);
    if (!subSubject) {
      return res.status(404).json({
        success: false,
        message: "Sub-Subject not found",
      });
    }
    await subSubject.update({ active: false });
    res.status(200).json({
      success: true,
      message: "Sub-Subject removed successfully",
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
  createSubSubject,
  updateSubSubject,
  deleteSubSubject,
};
