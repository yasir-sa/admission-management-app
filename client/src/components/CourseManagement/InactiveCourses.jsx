import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";

function InactiveCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchInactive = async () => {
    setLoading(true);
    try {
      const response = await API.get("/courses?active=false");
      setCourses(response.data.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load inactive courses."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactive();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const restoreCourse = async (id) => {
    setRestoringId(id);
    try {
      const response = await API.put(`/courses/${id}/restore`);
      setCourses((prev) => prev.filter((row) => row.id !== id));
      setToast({
        variant: "success",
        message: response.data.message || "Course restored successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to restore course.",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.course_name || "").toLowerCase().includes(term) ||
      (c.course_code || "").toLowerCase().includes(term)
    );
  });

  if (loading)
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  if (error) return <p className="text-center text-danger p-4">{error}</p>;

  return (
    <div className="container-fluid" style={{ maxWidth: "1000px" }}>
      {toast && (
        <div
          className="toast-container position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1080 }}
        >
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

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Inactive Courses</h4>
            <Link to="/courses" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-arrow-left me-1"></i> Back to Course
              Management
            </Link>
          </div>

          <div className="input-group mb-3" style={{ maxWidth: "350px" }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Course Name or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Standard Fee</th>
                  <th>Total Seats</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted py-4" colSpan={8}>
                      No inactive courses found.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c, index) => (
                    <tr key={c.id}>
                      <td>{index + 1}</td>
                      <td>{c.course_code || "-"}</td>
                      <td>{c.course_name}</td>
                      <td>{c.category || "-"}</td>
                      <td>{c.duration || "-"}</td>
                      <td>{c.standard_fee || "-"}</td>
                      <td>{c.total_seats || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          disabled={restoringId === c.id}
                          onClick={() => restoreCourse(c.id)}
                        >
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          {restoringId === c.id ? "Restoring..." : "Restore"}
                        </button>
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

export default InactiveCourses;
