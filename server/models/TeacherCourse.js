const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");
const Course = require("./Course");

const TeacherCourse = sequelize.define(
  "TeacherCourse",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Teacher,
        key: "id",
      },
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Course,
        key: "id",
      },
    },
  },
  {
    tableName: "teacher_courses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Teacher.belongsToMany(Course, {
  through: TeacherCourse,
  foreignKey: "teacher_id",
  otherKey: "course_id",
});
Course.belongsToMany(Teacher, {
  through: TeacherCourse,
  foreignKey: "course_id",
  otherKey: "teacher_id",
});

module.exports = TeacherCourse;
