const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
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
const Holiday = require("./models/Holiday");
const TeacherAvailability = require("./models/TeacherAvailability");
const SlotSubstitution = require("./models/SlotSubstitution");
const ClassSession = require("./models/ClassSession");
const StudentEntryAttendance = require("./models/StudentEntryAttendance");
const TeacherEntryAttendance = require("./models/TeacherEntryAttendance");
const Expense = require("./models/Expense");
const Batch = require("./models/Batch");
const BatchStudent = require("./models/BatchStudent");
const BatchSession = require("./models/BatchSession");
const BatchSubstitution = require("./models/BatchSubstitution");

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
const teacherAuthRoutes = require("./routes/teacherAuthRoutes");
const groupRoutes = require("./routes/groupRoutes");
const weeklyScheduleRoutes = require("./routes/weeklyScheduleRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const teacherAvailabilityRoutes = require("./routes/teacherAvailabilityRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const entryAttendanceRoutes = require("./routes/entryAttendanceRoutes");
const batchRoutes = require("./routes/batchRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const requireAdminAuth = require("./middleware/adminAuth");

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
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is running");
});

// Public — no admin login required (self-service links for teachers/students,
// admin registration/login itself, and holidays which those public pages read)
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/attendance-auth", attendanceAuthRoutes);
app.use("/api/teacher-auth", teacherAuthRoutes);
app.use("/api/holidays", holidayRoutes);

// Everything below requires a logged-in admin
app.use("/api/admissions", requireAdminAuth, admissionRoutes);
app.use("/api/fee-payments", requireAdminAuth, feePaymentRoutes);
app.use("/api/information-sheets", requireAdminAuth, informationSheetRoutes);
app.use("/api/courses", requireAdminAuth, courseRoutes);
app.use("/api/fee-entries", requireAdminAuth, feeEntryRoutes);
app.use("/api/attendance", requireAdminAuth, attendanceRoutes);
app.use("/api/subjects", requireAdminAuth, subjectRoutes);
app.use("/api/teachers", requireAdminAuth, teacherRoutes);
app.use("/api/groups", requireAdminAuth, groupRoutes);
app.use("/api/weekly-schedules", requireAdminAuth, weeklyScheduleRoutes);
app.use("/api/teacher-availability", requireAdminAuth, teacherAvailabilityRoutes);
app.use("/api/expenses", requireAdminAuth, expenseRoutes);
app.use("/api/entry-attendance", requireAdminAuth, entryAttendanceRoutes);
app.use("/api/batches", requireAdminAuth, batchRoutes);

sequelize.sync({ alter: true }).then(() => {
  console.log("Admissions and FeePayments tables synced");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});