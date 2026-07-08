const InformationSheet = require("../models/InformationSheet");
const Admission = require("../models/Admission");

const FIELDS = [
  "pin_code",
  "qualification_status",
  "qualification_year",
  "qualification_subject",
  "prior_course_institution",
  "prior_course_subject",
  "family_income",
  "study_reason",
  "course_interested",
  "preferred_timings",
  "plan_to_join",
  "heard_source",
  "heard_source_detail",
  "interested_updates",
  "date_of_joining",
  "counselling_handled_by",
  "counselling_date",
  "counselling_time",
];

const pickFields = (body) => {
  const data = {};
  FIELDS.forEach((field) => {
    data[field] = body[field] ?? null;
  });
  return data;
};

const createInformationSheet = async (req, res) => {
  try {
    const { admission_id } = req.body;

    const admission = await Admission.findByPk(admission_id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    const existing = await InformationSheet.findOne({
      where: { admission_id },
    });
    if (existing) {
      await existing.update(pickFields(req.body));
      return res.status(200).json({
        success: true,
        message: "Information sheet updated successfully",
        data: existing,
      });
    }

    const sheet = await InformationSheet.create({
      admission_id,
      ...pickFields(req.body),
    });

    res.status(201).json({
      success: true,
      message: "Information sheet saved successfully",
      data: sheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateInformationSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const sheet = await InformationSheet.findByPk(id);
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: "Information sheet not found",
      });
    }

    await sheet.update(pickFields(req.body));

    res.status(200).json({
      success: true,
      message: "Information sheet updated successfully",
      data: sheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { createInformationSheet, updateInformationSheet };
