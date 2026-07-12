const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Subject = require("./Subject");

const SubSubject = sequelize.define(
  "SubSubject",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Subject,
        key: "id",
      },
    },
    sub_subject_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    syllabus: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "sub_subjects",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Subject.hasMany(SubSubject, { foreignKey: "subject_id" });
SubSubject.belongsTo(Subject, { foreignKey: "subject_id" });

module.exports = SubSubject;
