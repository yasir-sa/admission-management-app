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
  const [records, setRecords] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("Present");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendanceRes, admissionsRes] = await Promise.all([
          API.get("/attendance"),
          API.get("/admissions?active=true"),
        ]);
        setRecords(attendanceRes.data.data);
        setAdmissions(admissionsRes.data.data);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load attendance records."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const filteredRecords = records.filter(
    (r) => r.date === selectedDate && r.status === statusFilter
  );

  if (loading) return <p className="text-center text-muted p-4">Loading...</p>;
  if (error) return <p className="text-center text-danger p-4">{error}</p>;

  return (
    <div className="container-fluid" style={{ maxWidth: "900px" }}>
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
            <h4 className="mb-0">Attendance Records</h4>
            <Link to="/attendance/scan" className="btn btn-primary btn-sm">
              Scan Attendance
            </Link>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-end gap-2 flex-wrap">
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
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "Present" ? "btn-success" : "btn-outline-success"}`}
                onClick={() => setStatusFilter("Present")}
              >
                Present
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "Absent" ? "btn-danger" : "btn-outline-danger"}`}
                onClick={() => setStatusFilter("Absent")}
              >
                Absent
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Timing</th>
                  <th>Date</th>
                  <th>Marked At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted" colSpan={7}>
                      No {statusFilter.toLowerCase()} records for{" "}
                      {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, index) => (
                    <tr key={r.id}>
                      <td>{index + 1}</td>
                      <td>{r.applicant_name || "-"}</td>
                      <td>{r.group_name || "-"}</td>
                      <td>{r.timing || "-"}</td>
                      <td>{r.date}</td>
                      <td>
                        {r.marked_at
                          ? new Date(r.marked_at).toLocaleTimeString("en-IN")
                          : "-"}
                      </td>
                      <td>
                        <span
                          className={`badge ${r.status === "Absent" ? "bg-danger" : "bg-success"}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceList;
