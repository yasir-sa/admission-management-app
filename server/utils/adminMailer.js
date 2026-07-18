const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendAdminOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `Course Admission <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Admin Verification OTP",
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`,
  });
};

module.exports = { sendAdminOtpEmail };
