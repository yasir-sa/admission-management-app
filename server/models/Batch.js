const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admin = require("./Admin");
const Subject = require("./Subject");
const Teacher = require("./Teacher");

const Batch = sequelize.define(
  "Batch",
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
    batch_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // 'fast_track' | 'normal_mwf' | 'normal_tts' | 'weekend'
    section: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Subject, key: "id" },
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Teacher, key: "id" },
    },
    timing: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    num_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "batches",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Subject.hasMany(Batch, { foreignKey: "subject_id" });
Batch.belongsTo(Subject, { foreignKey: "subject_id" });
Teacher.hasMany(Batch, { foreignKey: "teacher_id" });
Batch.belongsTo(Teacher, { foreignKey: "teacher_id" });

module.exports = Batch;
