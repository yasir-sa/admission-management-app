const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course");
const Subject = require("./Subject");

const CourseSubject = sequelize.define(
  "CourseSubject",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Course,
        key: "id",
      },
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Subject,
        key: "id",
      },
    },
  },
  {
    tableName: "course_subjects",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Course.belongsToMany(Subject, {
  through: CourseSubject,
  foreignKey: "course_id",
  otherKey: "subject_id",
});
Subject.belongsToMany(Course, {
  through: CourseSubject,
  foreignKey: "subject_id",
  otherKey: "course_id",
});

module.exports = CourseSubject;
