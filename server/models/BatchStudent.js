const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Batch = require("./Batch");
const Admission = require("./Admission");

const BatchStudent = sequelize.define(
  "BatchStudent",
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
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Admission, key: "id" },
    },
  },
  {
    tableName: "batch_students",
    timestamps: false,
  }
);

Batch.belongsToMany(Admission, {
  through: BatchStudent,
  as: "Students",
  foreignKey: "batch_id",
  otherKey: "admission_id",
});
Admission.belongsToMany(Batch, {
  through: BatchStudent,
  foreignKey: "admission_id",
  otherKey: "batch_id",
});

module.exports = BatchStudent;
