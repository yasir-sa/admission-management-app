const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admission = require("./Admission");
const Admin = require("./Admin");

const StudentEntryAttendance = sequelize.define(
  "StudentEntryAttendance",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Admission,
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
    tableName: "student_entry_attendances",
    timestamps: false,
  }
);

Admission.hasMany(StudentEntryAttendance, { foreignKey: "admission_id" });
StudentEntryAttendance.belongsTo(Admission, { foreignKey: "admission_id" });

module.exports = StudentEntryAttendance;
