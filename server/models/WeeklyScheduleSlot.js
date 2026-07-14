const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const WeeklySchedule = require("./WeeklySchedule");
const Group = require("./Group");

const WeeklyScheduleSlot = sequelize.define(
  "WeeklyScheduleSlot",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    weekly_schedule_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: WeeklySchedule,
        key: "id",
      },
    },
    day_of_week: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Group,
        key: "id",
      },
    },
    timing: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    tableName: "weekly_schedule_slots",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

WeeklySchedule.hasMany(WeeklyScheduleSlot, {
  as: "Slots",
  foreignKey: "weekly_schedule_id",
});
WeeklyScheduleSlot.belongsTo(WeeklySchedule, {
  foreignKey: "weekly_schedule_id",
});
WeeklyScheduleSlot.belongsTo(Group, { foreignKey: "group_id" });

module.exports = WeeklyScheduleSlot;
