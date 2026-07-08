const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admission = require("./Admission");

const InformationSheet = sequelize.define(
  "InformationSheet",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: Admission,
        key: "id",
      },
    },
    pin_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    qualification_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    qualification_year: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    qualification_subject: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    prior_course_institution: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    prior_course_subject: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    family_income: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    study_reason: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    course_interested: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    preferred_timings: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    plan_to_join: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    heard_source: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    heard_source_detail: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    interested_updates: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    date_of_joining: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    counselling_handled_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    counselling_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    counselling_time: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "information_sheets",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Admission.hasOne(InformationSheet, { foreignKey: "admission_id" });
InformationSheet.belongsTo(Admission, { foreignKey: "admission_id" });

module.exports = InformationSheet;
