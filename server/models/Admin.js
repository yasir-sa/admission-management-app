const { DataTypes } = require('sequelize');
const sequelize = require("../config/db");

const Admin = sequelize.define('Admin', {
  adminId: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  name: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: true },
  provider: { type: DataTypes.STRING, defaultValue: 'local' },
  otp: { type: DataTypes.STRING, allowNull: true },
  otpExpires: { type: DataTypes.DATE, allowNull: true },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Admin;