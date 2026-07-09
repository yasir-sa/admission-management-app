const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4,
  connectionTimeout: 15000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Course Admission" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Attendance Login OTP",
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`,
  });
};

module.exports = { sendOtpEmail };
