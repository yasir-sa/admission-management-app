const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const WeeklyScheduleSlot = require("./WeeklyScheduleSlot");
const Teacher = require("./Teacher");

const ClassSession = sequelize.define(
  "ClassSession",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    weekly_schedule_slot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: WeeklyScheduleSlot,
        key: "id",
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Teacher,
        key: "id",
      },
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "class_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["weekly_schedule_slot_id", "date"] }],
  }
);

WeeklyScheduleSlot.hasOne(ClassSession, {
  foreignKey: "weekly_schedule_slot_id",
});
ClassSession.belongsTo(WeeklyScheduleSlot, {
  foreignKey: "weekly_schedule_slot_id",
});
ClassSession.belongsTo(Teacher, { foreignKey: "teacher_id" });

module.exports = ClassSession;
