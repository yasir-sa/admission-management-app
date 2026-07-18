const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Expense = sequelize.define(
  "Expense",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    expense_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    bill_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    paid_to: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    amount: {
      type: DataTypes.NUMERIC,
      allowNull: false,
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
    tableName: "expenses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Expense;
