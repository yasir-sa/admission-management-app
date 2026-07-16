const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admission = require("./Admission");
const Teacher = require("./Teacher");

// Separate from the class-schedule based Attendance/ClassSession tables —
// this logs a simple QR-scan "entry" for a student or teacher. Scanning
// logic that writes into this table is built out separately (not yet wired
// up); this just scaffolds the table so the QR codes have somewhere to log to.
const EntryAttendance = sequelize.define(
  "EntryAttendance",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    person_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Admission,
        key: "id",
      },
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Teacher,
        key: "id",
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
    tableName: "entry_attendances",
    timestamps: false,
  }
);

Admission.hasMany(EntryAttendance, { foreignKey: "admission_id" });
EntryAttendance.belongsTo(Admission, { foreignKey: "admission_id" });
Teacher.hasMany(EntryAttendance, { foreignKey: "teacher_id" });
EntryAttendance.belongsTo(Teacher, { foreignKey: "teacher_id" });

module.exports = EntryAttendance;
