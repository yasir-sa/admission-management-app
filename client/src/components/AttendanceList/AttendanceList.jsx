import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const todayStr = toDateStr(new Date());
const yesterdayStr = toDateStr(
  new Date(new Date().setDate(new Date().getDate() - 1))
);

function AttendanceList() {
  const [admissions, setAdmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [copied, setCopied] = useState(false);

  const [batches, setBatches] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchAttendance, setBatchAttendance] = useState([]);
  const [batchAttendanceLoading, setBatchAttendanceLoading] = useState(true);
  const [batchAttendanceError, setBatchAttendanceError] = useState("");

  useEffect(() => {
    const fetchStatic = async () => {
      try {
        const [admissionsRes, batchesRes] = await Promise.all([
          API.get("/admissions?active=true"),
          API.get("/batches?active=true"),
        ]);
        setAdmissions(admissionsRes.data.data);
        setBatches(batchesRes.data.data);
      } catch {
        // Batch/admission lists are secondary here; ignore failures silently.
      }
    };
    fetchStatic();
  }, []);

  useEffect(() => {
    const fetchBatchAttendance = async () => {
      setBatchAttendanceLoading(true);
      try {
        const response = await API.get("/attendance/batch-wise", {
          params: {
            date: selectedDate,
            batch_id: selectedBatchId || undefined,
          },
        });
        setBatchAttendance(response.data.data);
        setBatchAttendanceError("");
      } catch (err) {
        setBatchAttendanceError(
          err.response?.data?.message || "Failed to load attendance."
        );
      } finally {
        setBatchAttendanceLoading(false);
      }
    };
    fetchBatchAttendance();
  }, [selectedDate, selectedBatchId]);

  const searchResults = searchTerm.trim()
    ? admissions.filter((a) => {
        const term = searchTerm.toLowerCase();
        return (
          (a.applicant_name || "").toLowerCase().includes(term) ||
          (a.mobile_no || "").toLowerCase().includes(term)
        );
      })
    : [];

  const selectPerson = (person) => {
    setSelectedPerson(person);
    setSearchTerm("");
    setCopied(false);
  };

  const attendanceLink = selectedPerson
    ? `${window.location.origin}/attendance/register/${selectedPerson.slug}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(attendanceLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable; link is already visible in the input for manual copy
    }
  };

  return (
    <div className="container-fluid" style={{ maxWidth: "1100px" }}>
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h4 className="mb-3">Generate Attendance Link</h4>
          <label className="form-label">Search Student</label>
          <div className="position-relative mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by Name or Mobile No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div
                className="list-group position-absolute w-100 shadow-sm"
                style={{ zIndex: 10, maxHeight: "250px", overflowY: "auto" }}
              >
                {searchResults.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => selectPerson(a)}
                  >
                    <strong>{a.applicant_name}</strong> — {a.mobile_no}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPerson && (
            <div className="border rounded p-3 bg-light">
              <div className="text-muted small fw-bold text-uppercase mb-1">
                {selectedPerson.applicant_name}
              </div>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={attendanceLink}
                  readOnly
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={copyLink}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Attendance</h4>
            <Link to="/attendance/scan" className="btn btn-primary btn-sm">
              Scan Attendance
            </Link>
          </div>

          <div className="d-flex align-items-end gap-2 flex-wrap mb-3">
            <div>
              <label className="form-label small mb-1">Batch</label>
              <select
                className="form-select form-select-sm"
                style={{ minWidth: "220px" }}
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name} — {b.Subject?.subject_name || "No subject"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${selectedDate === todayStr ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setSelectedDate(todayStr)}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedDate === yesterdayStr ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setSelectedDate(yesterdayStr)}
            >
              Yesterday
            </button>
            <div>
              <label className="form-label small mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          {batchAttendanceLoading ? (
            <p className="text-center text-muted p-4">Loading...</p>
          ) : batchAttendanceError ? (
            <p className="text-center text-danger p-4">{batchAttendanceError}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle">
                <thead className="table-primary">
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Subject</th>
                    <th>Covered Topic</th>
                    <th>Entry Attendance</th>
                    <th>Teacher Attendance</th>
                    <th>Final Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batchAttendance.length === 0 ? (
                    <tr>
                      <td className="text-center text-muted" colSpan={7}>
                        No class held{selectedBatchId ? " for this batch" : ""} on{" "}
                        {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    batchAttendance.map((r, index) => (
                      <tr key={`${r.batch_id}-${r.student_id}`}>
                        <td>{index + 1}</td>
                        <td>
                          {r.student_name}
                          {r.comn_enrol_no && (
                            <span className="text-muted small"> ({r.comn_enrol_no})</span>
                          )}
                          <div className="text-muted small">{r.batch_name}</div>
                        </td>
                        <td>{r.subject_name || "-"}</td>
                        <td>{r.topic_covered || "-"}</td>
                        <td>
                          <span
                            className={`badge ${r.entry_attendance ? "bg-success" : "bg-secondary"}`}
                          >
                            {r.entry_attendance ? "True" : "False"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${r.teacher_attendance ? "bg-success" : "bg-secondary"}`}
                          >
                            {r.teacher_attendance ? "True" : "False"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${r.final_status === "Present" ? "bg-success" : "bg-danger"}`}
                          >
                            {r.final_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceList;
