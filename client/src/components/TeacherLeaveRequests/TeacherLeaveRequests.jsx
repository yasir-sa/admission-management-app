import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";

const STATUS_BADGE = {
  pending: "bg-warning text-dark",
  accepted: "bg-success",
  rejected: "bg-danger",
};

// Dedicated page (not a dashboard card) for a teacher to review leave
// requests students submit from the Flutter Student App — only ever
// shows requests for batches this teacher CURRENTLY owns; if a batch was
// transferred away, its requests stop appearing here automatically
// (server/controllers/leaveRequestController.js resolves ownership live).
function TeacherLeaveRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const fetchRequests = async () => {
    try {
      const response = await API.get("/teacher-auth/leave-requests");
      setRequests(response.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleReview = async (id, status) => {
    setReviewingId(id);
    try {
      await API.put(`/teacher-auth/leave-requests/${id}`, { status });
      await fetchRequests();
      setToast({ variant: "success", message: `Leave request ${status}.` });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to update this request.",
      });
    } finally {
      setReviewingId(null);
    }
  };

  const filteredRequests = requests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  return (
    <div className="container-fluid" style={{ maxWidth: "900px", padding: "24px" }}>
      {toast && (
        <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
          <div className={`toast show text-white bg-${toast.variant}`}>
            <div className="d-flex">
              <div className="toast-body">{toast.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setToast(null)}
              ></button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Leave Requests</h4>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1"></i> Back
        </button>
      </div>

      <div className="btn-group mb-3" role="group">
        {["pending", "accepted", "rejected", "all"].map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn-sm ${statusFilter === key ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setStatusFilter(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)} (
            {key === "all" ? requests.length : requests.filter((r) => r.status === key).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <p className="text-center text-danger p-4">{error}</p>
      ) : filteredRequests.length === 0 ? (
        <div className="text-muted small text-center p-4">No leave requests in this category.</div>
      ) : (
        filteredRequests.map((r) => (
          <div className="card shadow-sm mb-2" key={r.id}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <strong>{r.student_name}</strong>
                  {r.comn_enrol_no && <span className="text-muted small ms-2">({r.comn_enrol_no})</span>}
                  <div className="text-muted small">
                    {r.batch_name} — {r.subject_name || "-"}
                  </div>
                  <div className="text-muted small">
                    <i className="bi bi-calendar-event me-1"></i>
                    {r.session_date}
                    <span className="badge bg-info text-dark ms-2">
                      {r.leave_type === "retroactive" ? "After Class" : "Before Class"}
                    </span>
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[r.status] || "bg-secondary"}`}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </div>
              <div className="mt-2 small">{r.description}</div>
              {r.status === "pending" && (
                <div className="d-flex gap-2 mt-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={reviewingId === r.id}
                    onClick={() => handleReview(r.id, "accepted")}
                  >
                    {reviewingId === r.id ? "Saving..." : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={reviewingId === r.id}
                    onClick={() => handleReview(r.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TeacherLeaveRequests;
