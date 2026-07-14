const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Group = require("./Group");
const Admission = require("./Admission");

const GroupStudent = sequelize.define(
  "GroupStudent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Group,
        key: "id",
      },
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Admission,
        key: "id",
      },
    },
  },
  {
    tableName: "group_students",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Group.belongsToMany(Admission, {
  through: GroupStudent,
  foreignKey: "group_id",
  otherKey: "admission_id",
  as: "Students",
});
Admission.belongsToMany(Group, {
  through: GroupStudent,
  foreignKey: "admission_id",
  otherKey: "group_id",
  as: "Groups",
});

module.exports = GroupStudent;
