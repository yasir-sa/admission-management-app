import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import API from "../../api/api";

function AttendanceRegister() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [person, setPerson] = useState(null);
  const [step, setStep] = useState("intro");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const lookup = async () => {
      try {
        const response = await API.get(`/attendance-auth/lookup/${slug}`);
        setPerson(response.data.data);
        if (response.data.data.is_verified) {
          setStep("qr");
        }
      } catch (err) {
        setLinkError(err.response?.data?.message || "This link is not valid.");
      } finally {
        setLoading(false);
      }
    };
    lookup();
  }, [slug]);

  const requestOtp = async () => {
    setError("");
    setSubmitting(true);
    try {
      const response = await API.post("/attendance-auth/request-otp", { slug });
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
      await API.post("/attendance-auth/verify-otp", { slug, otp });
      setStep("qr");
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
        <div className="card-body text-center">
          {loading && <p className="text-muted">Loading...</p>}

          {!loading && linkError && (
            <div className="text-danger">{linkError}</div>
          )}

          {!loading && !linkError && person && (
            <>
              <h4 className="mb-3">Hi, {person.applicant_name}</h4>

              {step === "intro" && (
                <>
                  <p className="text-muted small">
                    Click below to receive an OTP on your registered email
                    {person.masked_email ? ` (${person.masked_email})` : ""}.
                  </p>
                  {error && (
                    <div className="text-danger small mb-3">{error}</div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    onClick={requestOtp}
                    disabled={submitting}
                  >
                    {submitting ? "Sending OTP..." : "Send OTP"}
                  </button>
                </>
              )}

              {step === "otp" && (
                <form onSubmit={verifyOtp} className="text-start">
                  <p className="text-muted small text-center">{maskedEmail}</p>
                  <label className="form-label">Enter OTP</label>
                  <input
                    type="text"
                    className="form-control mb-3"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    required
                  />
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

              {step === "qr" && (
                <div>
                  <div className="d-flex justify-content-center mb-3">
                    <QRCodeSVG value={slug} size={220} />
                  </div>
                  <p className="text-muted small">
                    Show this QR code to the admin for attendance.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceRegister;
