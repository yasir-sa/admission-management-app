const RESEND_API_URL = "https://api.resend.com/emails";

const sendOtpEmail = async (toEmail, otp) => {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Course Admission <onboarding@resend.dev>",
      to: [toEmail],
      subject: "Your Attendance Login OTP",
      html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to send OTP email: ${errorBody}`);
  }
};

module.exports = { sendOtpEmail };
