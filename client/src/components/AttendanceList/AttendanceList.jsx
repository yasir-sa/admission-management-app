import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";

function AttendanceList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await API.get("/attendance");
        setRecords(response.data.data);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load attendance records."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) return <p className="text-center text-muted p-4">Loading...</p>;
  if (error) return <p className="text-center text-danger p-4">{error}</p>;

  return (
    <div className="container-fluid" style={{ maxWidth: "900px" }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Attendance Records</h4>
            <Link to="/attendance/scan" className="btn btn-primary btn-sm">
              Scan Attendance
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Marked At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted" colSpan={5}>
                      No attendance records yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r, index) => (
                    <tr key={r.id}>
                      <td>{index + 1}</td>
                      <td>{r.Admission?.applicant_name || "-"}</td>
                      <td>{r.date}</td>
                      <td>
                        {new Date(r.marked_at).toLocaleTimeString("en-IN")}
                      </td>
                      <td>
                        <span className="badge bg-success">{r.status}</span>
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
