const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admission = require("./Admission");

const FeePayment = sequelize.define(
  "FeePayment",
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
    month: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    enrol_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bill_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    amount_paid: {
      type: DataTypes.NUMERIC,
      allowNull: true,
    },
    paid_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    amount_in_words: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    towards: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    payment_mode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    cheque_card_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "fee_payments",
    timestamps: false,
  }
);

Admission.hasMany(FeePayment, { foreignKey: "admission_id" });
FeePayment.belongsTo(Admission, { foreignKey: "admission_id" });

module.exports = FeePayment;
