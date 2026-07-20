import { useEffect, useRef, useState } from "react";
import { FiUser, FiLogOut, FiCheckCircle } from "react-icons/fi";
import API from "../../api/api";

const PROVIDER_LABELS = {
  google: "Google",
  local: "Normal",
};

function AdminProfileMenu({ adminInfo, onLogout }) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasPassword, setHasPassword] = useState(!!adminInfo?.hasPassword);

  const providerLabel = PROVIDER_LABELS[adminInfo?.provider] || adminInfo?.provider || "—";
  const showAvatar = adminInfo?.picture && !imgError;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await API.post("/admin-auth/set-password", { password });
      setHasPassword(true);
      setShowPasswordForm(false);
      setPassword("");
    } catch (err) {
      setError(
        err.response?.data?.errors?.password ||
          err.response?.data?.message ||
          "Failed to set password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const avatar = (size, iconSize) =>
    showAvatar ? (
      <img
        src={adminInfo.picture}
        alt=""
        width={size}
        height={size}
        className="rounded-circle"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    ) : (
      <div
        className="rounded-circle bg-light d-flex align-items-center justify-content-center"
        style={{ width: size, height: size }}
      >
        <FiUser size={iconSize} className="text-dark" />
      </div>
    );

  return (
    <div className="position-relative" ref={containerRef}>
      <button
        type="button"
        className="btn btn-sm p-0 border-0 bg-transparent d-flex"
        onClick={() => setOpen((v) => !v)}
      >
        {avatar(34, 18)}
      </button>

      {open && (
        <div
          className="position-absolute top-100 end-0 mt-2 shadow border rounded-3 bg-white overflow-hidden text-dark"
          style={{ minWidth: "280px", zIndex: 1050 }}
        >
          <div className="d-flex align-items-center gap-3 p-3 bg-light">
            {avatar(48, 22)}
            <div className="overflow-hidden">
              <div className="fw-semibold text-truncate">{adminInfo?.name || "—"}</div>
              <div className="text-muted small text-truncate">{adminInfo?.email}</div>
            </div>
          </div>

          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center small mb-2">
              <span className="text-muted">Provider</span>
              <span className="fw-medium">{providerLabel}</span>
            </div>

            <div className="d-flex justify-content-between align-items-center small mb-2">
              <span className="text-muted">Password</span>
              {hasPassword ? (
                <span className="text-success d-flex align-items-center gap-1 fw-medium">
                  <FiCheckCircle /> Set
                </span>
              ) : (
                <span className="text-muted fst-italic">Not set</span>
              )}
            </div>

            {!hasPassword && (
              showPasswordForm ? (
                <form onSubmit={handleSetPassword} className="mt-2 mb-2">
                  <input
                    type="password"
                    className="form-control form-control-sm mb-1"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    required
                    minLength={4}
                    autoFocus
                  />
                  {error && <div className="text-danger small mb-1">{error}</div>}
                  <div className="d-flex gap-1">
                    <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
                      {submitting ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary w-100 mt-1 mb-2"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Set Password
                </button>
              )
            )}

            <hr className="my-2" />

            <button
              type="button"
              className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-1"
              onClick={onLogout}
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProfileMenu;
