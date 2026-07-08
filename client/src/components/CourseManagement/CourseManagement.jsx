import { useEffect, useRef, useState } from "react";
import { Modal } from "bootstrap";
import API from "../../api/api";

const initialForm = {
  course_name: "",
  duration: "",
  standard_fee: "",
  timings: "",
  total_seats: "",
};

function CourseManagement() {
  const modalRef = useRef(null);
  const deleteModalRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const fetchCourses = async () => {
    try {
      const response = await API.get("/courses?active=true");
      setCourses(response.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const forceCleanup = () => {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    };
    const modalEl = modalRef.current;
    const deleteModalEl = deleteModalRef.current;
    if (!modalEl || !deleteModalEl) return;
    modalEl.addEventListener("hidden.bs.modal", forceCleanup);
    deleteModalEl.addEventListener("hidden.bs.modal", forceCleanup);
    return () => {
      modalEl.removeEventListener("hidden.bs.modal", forceCleanup);
      deleteModalEl.removeEventListener("hidden.bs.modal", forceCleanup);
    };
  }, [loading]);

  const filteredCourses = courses.filter((c) => {
    if (!searchTerm.trim()) return true;
    return c.course_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    Modal.getOrCreateInstance(modalRef.current).show();
  };

  const openEditModal = (course) => {
    setEditingId(course.id);
    setFormData({
      course_name: course.course_name || "",
      duration: course.duration || "",
      standard_fee: course.standard_fee || "",
      timings: course.timings || "",
      total_seats: course.total_seats || "",
    });
    Modal.getOrCreateInstance(modalRef.current).show();
  };

  const closeModal = () => {
    Modal.getOrCreateInstance(modalRef.current).hide();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = editingId
        ? await API.put(`/courses/${editingId}`, formData)
        : await API.post("/courses", formData);
      closeModal();
      await fetchCourses();
      setToast({
        variant: "success",
        message: response.data.message || "Course saved successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to save course.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id) => {
    setPendingDeleteId(id);
    Modal.getOrCreateInstance(deleteModalRef.current).show();
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/courses/${pendingDeleteId}`);
      Modal.getOrCreateInstance(deleteModalRef.current).hide();
      await fetchCourses();
      setToast({ variant: "success", message: "Course removed successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete course.",
      });
    }
  };

  if (loading) return <p className="text-center text-muted p-4">Loading...</p>;
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
            <h4 className="mb-0">Course Management</h4>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openAddModal}
            >
              <i className="bi bi-plus-lg me-1"></i> Add Course
            </button>
          </div>

          <div className="input-group mb-3" style={{ maxWidth: "350px" }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Course Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Course Name</th>
                  <th>Duration</th>
                  <th>Standard Fee</th>
                  <th>Timings</th>
                  <th>Total Seats</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted" colSpan={7}>
                      No courses found.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c, index) => (
                    <tr key={c.id}>
                      <td>{index + 1}</td>
                      <td>{c.course_name}</td>
                      <td>{c.duration || "-"}</td>
                      <td>{c.standard_fee || "-"}</td>
                      <td>{c.timings || "-"}</td>
                      <td>{c.total_seats || "-"}</td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEditModal(c)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => confirmDelete(c.id)}
                        >
                          <i className="bi bi-trash"></i>
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

      <div className="modal fade" id="courseModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingId ? "Edit Course" : "Add Course"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Course Name</label>
                    <input
                      type="text"
                      name="course_name"
                      className="form-control"
                      required
                      value={formData.course_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Duration</label>
                    <input
                      type="text"
                      name="duration"
                      className="form-control"
                      placeholder="e.g. 3 Months"
                      value={formData.duration}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Standard Fee</label>
                    <input
                      type="number"
                      name="standard_fee"
                      className="form-control"
                      value={formData.standard_fee}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Timings</label>
                    <input
                      type="text"
                      name="timings"
                      className="form-control"
                      placeholder="e.g. 10 AM - 12 PM"
                      value={formData.timings}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Total Seats</label>
                    <input
                      type="number"
                      name="total_seats"
                      className="form-control"
                      value={formData.total_seats}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className="modal fade"
        id="courseDeleteModal"
        tabIndex="-1"
        ref={deleteModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Remove Course</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              Are you sure you want to remove this course? It can be restored
              later from the database if needed.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseManagement;
