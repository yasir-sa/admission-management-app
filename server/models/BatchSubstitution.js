const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Batch = require("./Batch");
const Teacher = require("./Teacher");

const BatchSubstitution = sequelize.define(
  "BatchSubstitution",
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
    substitute_teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Teacher, key: "id" },
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "batch_substitutions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["batch_id", "date"] }],
  }
);

Batch.hasMany(BatchSubstitution, {
  as: "Substitutions",
  foreignKey: "batch_id",
});
BatchSubstitution.belongsTo(Batch, { foreignKey: "batch_id" });
BatchSubstitution.belongsTo(Teacher, {
  as: "SubstituteTeacher",
  foreignKey: "substitute_teacher_id",
});

module.exports = BatchSubstitution;
