const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admission = require("./Admission");

const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Admission,
        key: "id",
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    marked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Present",
    },
  },
  {
    tableName: "attendances",
    timestamps: false,
  }
);

Admission.hasMany(Attendance, { foreignKey: "admission_id" });
Attendance.belongsTo(Admission, { foreignKey: "admission_id" });

module.exports = Attendance;
