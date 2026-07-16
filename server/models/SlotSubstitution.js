const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const WeeklyScheduleSlot = require("./WeeklyScheduleSlot");
const Teacher = require("./Teacher");

const SlotSubstitution = sequelize.define(
  "SlotSubstitution",
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
    substitute_teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Teacher,
        key: "id",
      },
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "slot_substitutions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["weekly_schedule_slot_id", "date"] }],
  }
);

WeeklyScheduleSlot.hasMany(SlotSubstitution, {
  as: "Substitutions",
  foreignKey: "weekly_schedule_slot_id",
});
SlotSubstitution.belongsTo(WeeklyScheduleSlot, {
  foreignKey: "weekly_schedule_slot_id",
});
SlotSubstitution.belongsTo(Teacher, {
  as: "SubstituteTeacher",
  foreignKey: "substitute_teacher_id",
});

module.exports = SlotSubstitution;
