const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sequelize = require("./config/db");
const Admission = require("./models/Admission");
const FeePayment = require("./models/FeePayment");
const InformationSheet = require("./models/InformationSheet");
const Course = require("./models/Course");
const FeeEntry = require("./models/FeeEntry");
const Attendance = require("./models/Attendance");
const Subject = require("./models/Subject");
const CourseSubject = require("./models/CourseSubject");
const Teacher = require("./models/Teacher");
const TeacherCourse = require("./models/TeacherCourse");
const Group = require("./models/Group");
const GroupStudent = require("./models/GroupStudent");
const WeeklySchedule = require("./models/WeeklySchedule");
const WeeklyScheduleSlot = require("./models/WeeklyScheduleSlot");

const Admin = require("./models/Admin");


const admissionRoutes = require("./routes/admissionRoutes");
const feePaymentRoutes = require("./routes/feePaymentRoutes");
const informationSheetRoutes = require("./routes/informationSheetRoutes");
const courseRoutes = require("./routes/courseRoutes");
const feeEntryRoutes = require("./routes/feeEntryRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const attendanceAuthRoutes = require("./routes/attendanceAuthRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const groupRoutes = require("./routes/groupRoutes");
const weeklyScheduleRoutes = require("./routes/weeklyScheduleRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/admissions", admissionRoutes);
app.use("/api/fee-payments", feePaymentRoutes);
app.use("/api/information-sheets", informationSheetRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/fee-entries", feeEntryRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/attendance-auth", attendanceAuthRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/weekly-schedules", weeklyScheduleRoutes);

sequelize.sync({ alter: true }).then(() => {
  console.log("Admissions and FeePayments tables synced");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});