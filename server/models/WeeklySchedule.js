const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const WeeklySchedule = sequelize.define(
  "WeeklySchedule",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    schedule_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_on: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "weekly_schedules",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = WeeklySchedule;
