const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admin = require("./Admin");
const Batch = require("./Batch");
const Admission = require("./Admission");
const Teacher = require("./Teacher");

const LeaveRequest = sequelize.define(
  "LeaveRequest",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: Admin, key: "adminId" },
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Batch, key: "id" },
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Admission, key: "id" },
    },
    // The specific class date this leave concerns — pairs with batch_id
    // the same way BatchSession/ClassRecording already identify a session,
    // no FK to a session row.
    session_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // "advance" — submitted before the class happens ("I won't come
    // tomorrow"). "retroactive" — submitted after already being marked
    // absent, explaining a class already missed.
    leave_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "advance",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by_teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Teacher, key: "id" },
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "leave_requests",
    timestamps: true,
    createdAt: "requested_at",
    updatedAt: false,
  }
);

// Deliberately no hasMany/belongsTo here — Batch/Admission already carry
// other associations, and one more previously made sequelize.sync
// ({alter:true}) miscompute and try to drop an unrelated, still-in-use
// foreign key (see ClassRecording.js/CourseVideo.js for the same note).
// The plain `references` above still gives real FK integrity; controllers
// do their own batched lookups.
//
// Deliberately no stored teacher_id either — "which teacher currently
// owns this request" is always resolved live via batch_id -> Batch.teacher_id
// at query time, never a snapshot taken at submission time. That is what
// makes a Batch Transfer automatically redirect a pending leave request to
// the new teacher with no extra code anywhere.
module.exports = LeaveRequest;
