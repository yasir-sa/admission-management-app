import { useEffect, useState } from "react";
import API from "../../api/api";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Two independent features on one page, both scoped to one selected
// student at a time:
//   1. Send — an immediate, one-off notification (Notification table,
//      pulled and delivered by the Student App via its own FCM).
//   2. Schedule — a recurring daily in/out reminder time, stored directly
//      on the Admission row. If unset, the Student App falls back to
//      parsing this student's existing `timings` field.
function StudentNotifications() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const [sendForm, setSendForm] = useState({ title: "", description: "" });
  const [sending, setSending] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    scheduled_in_time: "",
    scheduled_out_time: "",
    notification_title: "",
    notification_description: "",
  });
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);

  const fetchAdmissions = async () => {
    try {
      const response = await API.get("/admissions");
      setAdmissions(response.data.data);
    } catch {
      // Non-critical — student list just won't populate.
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await API.get("/notifications");
      setHistory(response.data.data);
    } catch {
      // Non-critical — history panel just stays empty.
    }
  };

  useEffect(() => {
    fetchAdmissions();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const selected = admissions.find((a) => a.id === selectedId) || null;

  useEffect(() => {
    if (!selected) {
      setScheduleForm({
        scheduled_in_time: "",
        scheduled_out_time: "",
        notification_title: "",
        notification_description: "",
      });
      return;
    }
    setScheduleForm({
      scheduled_in_time: selected.scheduled_in_time || "",
      scheduled_out_time: selected.scheduled_out_time || "",
      notification_title: selected.notification_title || "",
      notification_description: selected.notification_description || "",
    });
    setSendForm({ title: "", description: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const term = searchTerm.trim().toLowerCase();
  const filteredAdmissions = term
    ? admissions.filter(
        (a) =>
          (a.applicant_name || "").toLowerCase().includes(term) ||
          (a.comn_enrol_no || "").toLowerCase().includes(term)
      )
    : admissions;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selected || !sendForm.title.trim() || !sendForm.description.trim()) return;
    setSending(true);
    try {
      await API.post("/notifications/send", {
        admission_id: selected.id,
        title: sendForm.title.trim(),
        description: sendForm.description.trim(),
      });
      setSendForm({ title: "", description: "" });
      await fetchHistory();
      setToast({ variant: "success", message: "Notification queued — the Student App will deliver it." });
    } catch (err) {
      setToast({ variant: "danger", message: err.response?.data?.message || "Failed to send." });
    } finally {
      setSending(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (scheduleForm.scheduled_in_time && !TIME_PATTERN.test(scheduleForm.scheduled_in_time)) return;
    if (scheduleForm.scheduled_out_time && !TIME_PATTERN.test(scheduleForm.scheduled_out_time)) return;
    setSaving(true);
    try {
      const response = await API.put("/notifications/schedule", {
        admission_id: selected.id,
        ...scheduleForm,
      });
      setAdmissions((prev) =>
        prev.map((a) => (a.id === selected.id ? { ...a, ...response.data.data } : a))
      );
      setToast({ variant: "success", message: "Schedule saved." });
    } catch (err) {
      setToast({ variant: "danger", message: err.response?.data?.message || "Failed to save schedule." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid" style={{ maxWidth: "1100px" }}>
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

      <h4 className="mb-3">Student Notifications</h4>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="mb-2">Select Student</h6>
              <input
                type="text"
                className="form-control form-control-sm mb-2"
                placeholder="Search name or enrol no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {loading ? (
                <div className="text-muted small">Loading...</div>
              ) : (
                <div className="list-group" style={{ maxHeight: "500px", overflowY: "auto" }}>
                  {filteredAdmissions.length === 0 ? (
                    <div className="text-muted small p-2">No students match.</div>
                  ) : (
                    filteredAdmissions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`list-group-item list-group-item-action ${
                          selectedId === a.id ? "active" : ""
                        }`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        <div className="fw-semibold small">{a.applicant_name}</div>
                        <div className={`small ${selectedId === a.id ? "" : "text-muted"}`}>
                          {a.comn_enrol_no || "-"} · {a.timings || "no timing set"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          {!selected ? (
            <div className="card shadow-sm">
              <div className="card-body text-muted text-center py-5">
                Select a student from the left to send or schedule a notification.
              </div>
            </div>
          ) : (
            <>
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="mb-3">
                    Send Notification Now — <span className="text-primary">{selected.applicant_name}</span>
                  </h6>
                  <form onSubmit={handleSend}>
                    <div className="mb-2">
                      <label className="form-label small mb-1">Title</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={sendForm.title}
                        onChange={(e) => setSendForm((p) => ({ ...p, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-1">Description</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={sendForm.description}
                        onChange={(e) => setSendForm((p) => ({ ...p, description: e.target.value }))}
                        required
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={sending}>
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="mb-1">
                    Schedule Daily Reminder — <span className="text-primary">{selected.applicant_name}</span>
                  </h6>
                  <p className="text-muted small mb-3">
                    Overrides this student's class timing ({selected.timings || "not set"}) for notification
                    purposes only. Leave both times blank to go back to using the class timing.
                  </p>
                  <form onSubmit={handleSaveSchedule}>
                    <div className="row g-2 mb-2">
                      <div className="col-md-6">
                        <label className="form-label small mb-1">In Time</label>
                        <input
                          type="time"
                          className="form-control form-control-sm"
                          value={scheduleForm.scheduled_in_time}
                          onChange={(e) =>
                            setScheduleForm((p) => ({ ...p, scheduled_in_time: e.target.value }))
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Out Time</label>
                        <input
                          type="time"
                          className="form-control form-control-sm"
                          value={scheduleForm.scheduled_out_time}
                          onChange={(e) =>
                            setScheduleForm((p) => ({ ...p, scheduled_out_time: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-1">Title</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={scheduleForm.notification_title}
                        onChange={(e) =>
                          setScheduleForm((p) => ({ ...p, notification_title: e.target.value }))
                        }
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-1">Description</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={scheduleForm.notification_description}
                        onChange={(e) =>
                          setScheduleForm((p) => ({ ...p, notification_description: e.target.value }))
                        }
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btn-sm btn-success" disabled={saving}>
                      {saving ? "Saving..." : "Save Schedule"}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h6 className="mb-2">Recent Sent Notifications</h6>
          {history.length === 0 ? (
            <div className="text-muted small">No notifications sent yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((n) => (
                    <tr key={n.id}>
                      <td>
                        {n.student_name}
                        {n.comn_enrol_no && (
                          <span className="text-muted small"> ({n.comn_enrol_no})</span>
                        )}
                      </td>
                      <td>{n.title}</td>
                      <td className="small text-muted">{n.description}</td>
                      <td>
                        <span className={`badge ${n.delivered ? "bg-success" : "bg-warning text-dark"}`}>
                          {n.delivered ? "Delivered" : "Pending"}
                        </span>
                      </td>
                      <td className="small text-muted">{new Date(n.created_at).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentNotifications;
