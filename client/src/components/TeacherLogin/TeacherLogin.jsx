import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";

function TeacherLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await API.post("/teacher-auth/login-request-otp", {
        email,
      });
      setMaskedEmail(response.data.message);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // Server sets the auth token as an httpOnly cookie on success —
      // nothing for the client to store, just move on.
      await API.post("/teacher-auth/login-verify-otp", { email, otp });
      navigate("/teacher/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="container-fluid d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", padding: "24px" }}
    >
      <div className="card shadow-sm w-100" style={{ maxWidth: "420px" }}>
        <div className="card-body">
          <h4 className="mb-3 text-center">Teacher Login</h4>

          {step === "email" && (
            <form onSubmit={requestOtp}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-danger small mb-3">{error}</div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={submitting}
              >
                {submitting ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              <p className="text-muted small text-center">{maskedEmail}</p>
              <div className="mb-3">
                <label className="form-label">Enter OTP</label>
                <input
                  type="text"
                  className="form-control"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  required
                />
              </div>
              {error && (
                <div className="text-danger small mb-3">{error}</div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={submitting}
              >
                {submitting ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherLogin;
