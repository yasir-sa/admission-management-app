const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");
const Admin = require("./Admin");

const TeacherEntryAttendance = sequelize.define(
  "TeacherEntryAttendance",
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
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Admin,
        key: "adminId",
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    marked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "teacher_entry_attendances",
    timestamps: false,
  }
);

Teacher.hasMany(TeacherEntryAttendance, { foreignKey: "teacher_id" });
TeacherEntryAttendance.belongsTo(Teacher, { foreignKey: "teacher_id" });

module.exports = TeacherEntryAttendance;
