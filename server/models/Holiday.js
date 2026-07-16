const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Holiday = sequelize.define(
  "Holiday",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "holidays",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Holiday;
