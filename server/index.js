const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sequelize = require("./config/db");
const Admission = require("./models/Admission");
const FeePayment = require("./models/FeePayment");

const Admin = require("./models/Admin");


const admissionRoutes = require("./routes/admissionRoutes");
const feePaymentRoutes = require("./routes/feePaymentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/admissions", admissionRoutes);
app.use("/api/fee-payments", feePaymentRoutes);

sequelize.sync({ alter: true }).then(() => {
  console.log("Admissions and FeePayments tables synced");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});