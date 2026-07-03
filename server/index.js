const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sequelize = require("./config/db");
const Admission = require("./models/Admission");
const FeePayment = require("./models/FeePayment");
const admissionRoutes = require("./routes/admissionRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/admissions", admissionRoutes);

sequelize.sync({ alter: true }).then(() => {
  console.log("Admissions and FeePayments tables synced");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
