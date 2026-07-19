const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admin = require("./Admin");

const FeeEntry = sequelize.define(
  "FeeEntry",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Admin,
        key: "adminId",
      },
    },
    bill_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    enrol_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    amount: {
      type: DataTypes.NUMERIC,
      allowNull: false,
    },
    paid_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    payment_mode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "fee_entries",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = FeeEntry;
