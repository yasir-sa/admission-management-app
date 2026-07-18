import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api/api";

function AdminRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState("form");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await API.post("/admin-auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      setStep("otp");
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setErrors(serverErrors);
      } else {
        setError(err.response?.data?.message || "Failed to register.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // Server sets the auth token as an httpOnly cookie on success —
      // nothing for the client to store, just move on.
      await API.post("/admin-auth/verify-otp", {
        email: formData.email,
        otp,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setSubmitting(true);
    try {
      const response = await API.post("/admin-auth/request-otp", {
        email: formData.email,
      });
      setError("");
      setErrors({});
      window.alert(response.data.message || "OTP resent.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
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
          {step === "form" && (
            <>
              <h4 className="mb-3 text-center">Register Admin</h4>
              <form onSubmit={handleRegisterSubmit}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback">
                      {errors.confirmPassword}
                    </div>
                  )}
                </div>
                {error && (
                  <div className="text-danger small mb-3">{error}</div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={submitting}
                >
                  {submitting ? "Registering..." : "Register"}
                </button>
              </form>
              <p className="text-center text-muted small mt-3 mb-0">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <h4 className="mb-3 text-center">Verify Your Email</h4>
              <p className="text-muted small text-center">
                OTP sent to {formData.email}
              </p>
              <form onSubmit={handleVerifyOtp}>
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
                  className="btn btn-primary w-100 mb-2"
                  disabled={submitting}
                >
                  {submitting ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  disabled={submitting}
                  onClick={resendOtp}
                >
                  Resend OTP
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;
