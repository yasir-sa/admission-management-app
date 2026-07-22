const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Batch = require("./Batch");
const Teacher = require("./Teacher");

const BatchSession = sequelize.define(
  "BatchSession",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Batch, key: "id" },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Teacher, key: "id" },
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    topic_covered: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "batch_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["batch_id", "date"] }],
  }
);

Batch.hasOne(BatchSession, { foreignKey: "batch_id" });
BatchSession.belongsTo(Batch, { foreignKey: "batch_id" });
BatchSession.belongsTo(Teacher, { foreignKey: "teacher_id" });

module.exports = BatchSession;
