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

function EntryAttendance() {
  const [personType, setPersonType] = useState("student");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const endpoint =
          personType === "student"
            ? "/entry-attendance/students"
            : "/entry-attendance/teachers";
        const response = await API.get(endpoint, {
          params: { date: selectedDate },
        });
        setEntries(response.data.data);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load entry attendance."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [personType, selectedDate]);

  return (
    <div className="container-fluid" style={{ maxWidth: "900px" }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Entry Attendance</h4>
            <Link to="/entry-attendance/scan" className="btn btn-primary btn-sm">
              Scan Entry Attendance
            </Link>
          </div>

          <div className="btn-group mb-3" role="group">
            <button
              type="button"
              className={`btn btn-sm ${personType === "student" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setPersonType("student")}
            >
              Student
            </button>
            <button
              type="button"
              className={`btn btn-sm ${personType === "teacher" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setPersonType("teacher")}
            >
              Teacher
            </button>
          </div>

          <div className="d-flex align-items-end gap-2 flex-wrap mb-3">
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

          {loading ? (
            <p className="text-center text-muted p-4">Loading...</p>
          ) : error ? (
            <p className="text-center text-danger p-4">{error}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle">
                <thead className="table-primary">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Entry Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td className="text-center text-muted" colSpan={4}>
                        No {personType} entries for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    entries.map((e, index) => (
                      <tr key={e.id}>
                        <td>{index + 1}</td>
                        <td>{e.name}</td>
                        <td>{e.date}</td>
                        <td>
                          {e.marked_at
                            ? new Date(e.marked_at).toLocaleTimeString("en-IN")
                            : "-"}
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

export default EntryAttendance;
