import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../../api/api";

const initialForm = {
  course_code: "",
  course_name: "",
  category: "",
  description: "",
  level: "",
  status: "Active",
  duration: "",
  standard_fee: "",
  timings: "",
  total_seats: "",
};

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STATUSES = ["Active", "Upcoming", "Completed"];

const STATUS_BADGE = {
  Active: "bg-success",
  Upcoming: "bg-warning",
  Completed: "bg-secondary",
};

const EXPORT_COLUMNS = [
  { key: "course_code", label: "Course Code" },
  { key: "course_name", label: "Course Name" },
  { key: "category", label: "Category" },
  { key: "level", label: "Level" },
  { key: "duration", label: "Duration" },
  { key: "standard_fee", label: "Standard Fee" },
  { key: "timings", label: "Timings" },
  { key: "total_seats", label: "Total Seats" },
  { key: "status", label: "Status" },
];

const SORT_OPTIONS = [
  { key: "course_name", label: "Name" },
  { key: "standard_fee", label: "Fee" },
  { key: "duration", label: "Duration" },
  { key: "total_seats", label: "Seats" },
];

function CourseManagement() {
  const modalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const viewModalRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sortField, setSortField] = useState("course_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [viewCourse, setViewCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

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

  const fetchSubjects = async () => {
    try {
      const response = await API.get("/subjects?active=true");
      setSubjects(response.data.data);
    } catch {
      // Subjects list is a secondary feature here; ignore failures silently.
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchSubjects();
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
    const viewModalEl = viewModalRef.current;
    if (!modalEl || !deleteModalEl || !viewModalEl) return;
    [modalEl, deleteModalEl, viewModalEl].forEach((el) =>
      el.addEventListener("hidden.bs.modal", forceCleanup)
    );
    return () => {
      [modalEl, deleteModalEl, viewModalEl].forEach((el) =>
        el.removeEventListener("hidden.bs.modal", forceCleanup)
      );
    };
  }, [loading]);

  const categories = Array.from(
    new Set(courses.map((c) => c.category).filter(Boolean))
  ).sort();

  const summary = {
    total: courses.length,
    active: courses.filter((c) => c.status === "Active").length,
    totalSeats: courses.reduce((sum, c) => sum + (Number(c.total_seats) || 0), 0),
    availableSeats: courses
      .filter((c) => c.status === "Active")
      .reduce((sum, c) => sum + (Number(c.total_seats) || 0), 0),
  };

  const filteredCourses = courses
    .filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchesOwnFields = Object.entries(c).some(
        ([key, value]) =>
          key !== "Subjects" &&
          value !== null &&
          value !== undefined &&
          value.toString().toLowerCase().includes(term)
      );
      if (matchesOwnFields) return true;
      return (c.Subjects || []).some((s) =>
        (s.subject_name || "").toLowerCase().includes(term)
      );
    })
    .filter((c) => (categoryFilter ? c.category === categoryFilter : true))
    .filter((c) => (statusFilter ? c.status === statusFilter : true))
    .filter((c) => (levelFilter ? c.level === levelFilter : true));

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    let result;
    if (sortField === "standard_fee" || sortField === "total_seats") {
      result = (Number(valA) || 0) - (Number(valB) || 0);
    } else {
      result = valA.toString().localeCompare(valB.toString());
    }
    return sortOrder === "asc" ? result : -result;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return "bi-arrow-down-up text-muted";
    return sortOrder === "asc" ? "bi-sort-up" : "bi-sort-down";
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setFormErrors({});
    setSelectedSubjectIds([]);
    Modal.getOrCreateInstance(modalRef.current).show();
  };

  const openEditModal = (course) => {
    setEditingId(course.id);
    setFormData({
      course_code: course.course_code || "",
      course_name: course.course_name || "",
      category: course.category || "",
      description: course.description || "",
      level: course.level || "",
      status: course.status || "Active",
      duration: course.duration || "",
      standard_fee: course.standard_fee || "",
      timings: course.timings || "",
      total_seats: course.total_seats || "",
    });
    setFormErrors({});
    setSelectedSubjectIds((course.Subjects || []).map((s) => s.id));
    Modal.getOrCreateInstance(modalRef.current).show();
  };

  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const openViewModal = (course) => {
    setViewCourse(course);
    Modal.getOrCreateInstance(viewModalRef.current).show();
  };

  const closeModal = () => {
    Modal.getOrCreateInstance(modalRef.current).hide();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const errors = {};
    if (!formData.course_name.trim()) {
      errors.course_name = "Course Name is required.";
    }
    if (formData.standard_fee !== "" && Number(formData.standard_fee) < 0) {
      errors.standard_fee = "Fee cannot be negative.";
    }
    if (formData.total_seats !== "" && Number(formData.total_seats) <= 0) {
      errors.total_seats = "Seats must be greater than zero.";
    }
    if (
      formData.course_code &&
      courses.some(
        (c) =>
          c.course_code &&
          c.course_code.toLowerCase() === formData.course_code.toLowerCase() &&
          c.id !== editingId
      )
    ) {
      errors.course_code = "This Course Code is already in use.";
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const response = editingId
        ? await API.put(`/courses/${editingId}`, formData)
        : await API.post("/courses", formData);
      const courseId = editingId || response.data.data.id;
      await API.put(`/courses/${courseId}/subjects`, {
        subject_ids: selectedSubjectIds,
      });
      closeModal();
      await fetchCourses();
      setToast({
        variant: "success",
        message: response.data.message || "Course saved successfully",
      });
    } catch (err) {
      const field = err.response?.data?.field;
      const message = err.response?.data?.message;
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setFormErrors(serverErrors);
      } else if (field) {
        setFormErrors({ [field]: message });
      } else {
        setToast({
          variant: "danger",
          message: message || "Failed to save course.",
        });
      }
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

  const exportToExcel = () => {
    const data = sortedCourses.map((row) => {
      const record = {};
      EXPORT_COLUMNS.forEach((col) => {
        record[col.label] = row[col.key] ?? "";
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Courses");
    XLSX.writeFile(workbook, "course_list.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const head = [EXPORT_COLUMNS.map((col) => col.label)];
    const body = sortedCourses.map((row) =>
      EXPORT_COLUMNS.map((col) => (row[col.key] ?? "-").toString())
    );
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [29, 78, 216] },
    });
    doc.save("course_list.pdf");
  };

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
    <div className="container-fluid" style={{ maxWidth: "1200px" }}>
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

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase fw-bold">
                Total Courses
              </div>
              <div className="fs-3 fw-bold text-primary">{summary.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase fw-bold">
                Active Courses
              </div>
              <div className="fs-3 fw-bold text-success">{summary.active}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase fw-bold">
                Total Seats
              </div>
              <div className="fs-3 fw-bold text-dark">{summary.totalSeats}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase fw-bold">
                Available Seats
              </div>
              <div className="fs-3 fw-bold text-info">
                {summary.availableSeats}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Course Management</h4>
            <div className="d-flex gap-2 flex-wrap">
              <Link
                to="/courses/inactive"
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="bi bi-archive me-1"></i> Inactive Courses
              </Link>
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={exportToExcel}
              >
                <i className="bi bi-file-earmark-excel me-1"></i> Export Excel
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={exportToPDF}
              >
                <i className="bi bi-file-earmark-pdf me-1"></i> Export PDF
              </button>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={() => window.print()}
              >
                <i className="bi bi-printer me-1"></i> Print
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openAddModal}
              >
                <i className="bi bi-plus-lg me-1"></i> Add Course
              </button>
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <div className="input-group">
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
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="">All Levels</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={`${sortField}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(":");
                  setSortField(field);
                  setSortOrder(order);
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <optgroup key={opt.key} label={`Sort by ${opt.label}`}>
                    <option value={`${opt.key}:asc`}>
                      {opt.label} (A–Z / Low–High)
                    </option>
                    <option value={`${opt.key}:desc`}>
                      {opt.label} (Z–A / High–Low)
                    </option>
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Course Code</th>
                  <th
                    role="button"
                    onClick={() => handleSort("course_name")}
                  >
                    Course Name{" "}
                    <i className={`bi ${sortIcon("course_name")}`}></i>
                  </th>
                  <th>Category</th>
                  <th role="button" onClick={() => handleSort("duration")}>
                    Duration <i className={`bi ${sortIcon("duration")}`}></i>
                  </th>
                  <th
                    role="button"
                    onClick={() => handleSort("standard_fee")}
                  >
                    Standard Fee{" "}
                    <i className={`bi ${sortIcon("standard_fee")}`}></i>
                  </th>
                  <th>Timings</th>
                  <th
                    role="button"
                    onClick={() => handleSort("total_seats")}
                  >
                    Total Seats{" "}
                    <i className={`bi ${sortIcon("total_seats")}`}></i>
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted py-4" colSpan={10}>
                      <i className="bi bi-inbox fs-3 d-block mb-2"></i>
                      No courses found.
                    </td>
                  </tr>
                ) : (
                  sortedCourses.map((c, index) => (
                    <tr key={c.id}>
                      <td>{index + 1}</td>
                      <td>{c.course_code || "-"}</td>
                      <td>{c.course_name}</td>
                      <td>{c.category || "-"}</td>
                      <td>{c.duration || "-"}</td>
                      <td>{c.standard_fee || "-"}</td>
                      <td>{c.timings || "-"}</td>
                      <td>{c.total_seats || "-"}</td>
                      <td>
                        <span
                          className={`badge ${STATUS_BADGE[c.status] || "bg-secondary"}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="View"
                          onClick={() => openViewModal(c)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          title="Edit"
                          onClick={() => openEditModal(c)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Delete"
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

      {/* Add/Edit Modal */}
      <div className="modal fade" id="courseModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
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
              <div
                className="modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Course Code</label>
                    <input
                      type="text"
                      name="course_code"
                      className={`form-control ${formErrors.course_code ? "is-invalid" : ""}`}
                      value={formData.course_code}
                      onChange={handleChange}
                    />
                    {formErrors.course_code && (
                      <div className="invalid-feedback">
                        {formErrors.course_code}
                      </div>
                    )}
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Course Name</label>
                    <input
                      type="text"
                      name="course_name"
                      className={`form-control ${formErrors.course_name ? "is-invalid" : ""}`}
                      value={formData.course_name}
                      onChange={handleChange}
                    />
                    {formErrors.course_name && (
                      <div className="invalid-feedback">
                        {formErrors.course_name}
                      </div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      name="category"
                      className="form-control"
                      placeholder="e.g. Computer Course"
                      value={formData.category}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Course Level</label>
                    <select
                      name="level"
                      className="form-select"
                      value={formData.level}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Course Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Course Description</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                    ></textarea>
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
                      className={`form-control ${formErrors.standard_fee ? "is-invalid" : ""}`}
                      value={formData.standard_fee}
                      onChange={handleChange}
                    />
                    {formErrors.standard_fee && (
                      <div className="invalid-feedback">
                        {formErrors.standard_fee}
                      </div>
                    )}
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
                      className={`form-control ${formErrors.total_seats ? "is-invalid" : ""}`}
                      value={formData.total_seats}
                      onChange={handleChange}
                    />
                    {formErrors.total_seats && (
                      <div className="invalid-feedback">
                        {formErrors.total_seats}
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label d-block">Subjects</label>
                    {subjects.length === 0 ? (
                      <div className="text-muted small">
                        No subjects added yet — go to Subject Management to
                        add some.
                      </div>
                    ) : (
                      <div className="row g-2 border rounded p-2">
                        {subjects.map((subject) => (
                          <div className="col-md-4" key={subject.id}>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={selectedSubjectIds.includes(
                                  subject.id
                                )}
                                onChange={() =>
                                  toggleSubjectSelection(subject.id)
                                }
                              />
                              <label className="form-check-label">
                                {subject.subject_name}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

      {/* View Modal */}
      <div className="modal fade" id="courseViewModal" tabIndex="-1" ref={viewModalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Course Details</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              {viewCourse && (
                <div className="row g-3">
                  {EXPORT_COLUMNS.map((col) => (
                    <div className="col-md-4" key={col.key}>
                      <div className="text-muted small fw-bold text-uppercase">
                        {col.label}
                      </div>
                      <div>{viewCourse[col.key] || "-"}</div>
                    </div>
                  ))}
                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">
                      Description
                    </div>
                    <div>{viewCourse.description || "-"}</div>
                  </div>
                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">
                      Subjects
                    </div>
                    <div>
                      {(viewCourse.Subjects || []).length === 0
                        ? "-"
                        : viewCourse.Subjects.map((s) => (
                            <span
                              key={s.id}
                              className="badge bg-info text-dark me-1"
                            >
                              {s.subject_name}
                            </span>
                          ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to remove this course? It will be moved to
              Inactive Courses and can be restored later.
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
