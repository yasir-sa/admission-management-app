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
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
