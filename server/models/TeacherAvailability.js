const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const TeacherAvailability = sequelize.define(
  "TeacherAvailability",
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: "teacher_availabilities",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["teacher_id", "date"] }],
  }
);

Teacher.hasMany(TeacherAvailability, { foreignKey: "teacher_id" });
TeacherAvailability.belongsTo(Teacher, { foreignKey: "teacher_id" });

module.exports = TeacherAvailability;
