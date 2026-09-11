const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admin = require("./Admin");
const Admission = require("./Admission");

// One-off, immediate "Send" notifications only — the recurring
// schedule-based ones live as columns directly on Admission (see that
// model's comment) since there's nothing per-occurrence to track there.
const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: Admin, key: "adminId" },
    },
    admission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Admission, key: "id" },
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Set true once the Student App has fetched and delivered this one —
    // stops it being re-sent on the app's next poll.
    delivered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

// No association calls — same reasoning as ClassRecording.js/LeaveRequest.js:
// Admission already carries other associations, and one more here risks
// sync({alter:true}) miscomputing a drop on an unrelated FK.
module.exports = Notification;
