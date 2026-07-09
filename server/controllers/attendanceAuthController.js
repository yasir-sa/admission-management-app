const Admission = require("../models/Admission");
const { sendOtpEmail } = require("../utils/mailer");

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

const lookupBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const admission = await Admission.findOne({ where: { slug, active: true } });
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "This link is not valid",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        applicant_name: admission.applicant_name,
        masked_email: admission.email ? maskEmail(admission.email) : null,
        is_verified: admission.is_verified,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const requestOtp = async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Invalid link",
      });
    }

    const admission = await Admission.findOne({ where: { slug, active: true } });
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "This link is not valid",
      });
    }
    if (!admission.email) {
      return res.status(400).json({
        success: false,
        message: "No email on file for this admission. Contact the office.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await admission.update({ otp, otp_expires: otpExpires });
    await sendOtpEmail(admission.email, otp);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${maskEmail(admission.email)}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { slug, otp } = req.body;
    if (!slug || !otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const admission = await Admission.findOne({ where: { slug, active: true } });
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "This link is not valid",
      });
    }

    if (
      !admission.otp ||
      admission.otp !== otp ||
      !admission.otp_expires ||
      new Date() > new Date(admission.otp_expires)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    await admission.update({
      is_verified: true,
      otp: null,
      otp_expires: null,
    });

    res.status(200).json({
      success: true,
      message: "Verified successfully",
      data: { slug: admission.slug, applicant_name: admission.applicant_name },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { lookupBySlug, requestOtp, verifyOtp };
