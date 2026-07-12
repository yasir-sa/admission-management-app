import { useEffect, useRef, useState } from "react";
import { Modal } from "bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../../api/api";

const initialSubjectForm = {
  subject_name: "",
  description: "",
  syllabus: "",
};

const initialSubSubjectForm = {
  sub_subject_name: "",
  syllabus: "",
};

function SubjectManagement() {
  const subjectModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const manageModalRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);

  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  const [subjectErrors, setSubjectErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [manageSubject, setManageSubject] = useState(null);
  const [subSubjectForm, setSubSubjectForm] = useState(initialSubSubjectForm);
  const [editingSubSubjectId, setEditingSubSubjectId] = useState(null);
  const [subSubjectErrors, setSubSubjectErrors] = useState({});

  const fetchSubjects = async () => {
    try {
      const response = await API.get("/subjects?active=true");
      setSubjects(response.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    const els = [
      subjectModalRef.current,
      deleteModalRef.current,
      manageModalRef.current,
    ];
    if (els.some((el) => !el)) return;
    els.forEach((el) => el.addEventListener("hidden.bs.modal", forceCleanup));
    return () => {
      els.forEach((el) =>
        el.removeEventListener("hidden.bs.modal", forceCleanup)
      );
    };
  }, [loading]);

  const filteredSubjects = subjects.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesSubject =
      (s.subject_name || "").toLowerCase().includes(term) ||
      (s.description || "").toLowerCase().includes(term) ||
      (s.syllabus || "").toLowerCase().includes(term);
    if (matchesSubject) return true;
    return (s.SubSubjects || []).some(
      (sub) =>
        (sub.sub_subject_name || "").toLowerCase().includes(term) ||
        (sub.syllabus || "").toLowerCase().includes(term)
    );
  });

  const totalSubSubjects = subjects.reduce(
    (sum, s) => sum + (s.SubSubjects?.length || 0),
    0
  );

  const openAddSubjectModal = () => {
    setEditingSubjectId(null);
    setSubjectForm(initialSubjectForm);
    setSubjectErrors({});
    Modal.getOrCreateInstance(subjectModalRef.current).show();
  };

  const openEditSubjectModal = (subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      subject_name: subject.subject_name || "",
      description: subject.description || "",
      syllabus: subject.syllabus || "",
    });
    setSubjectErrors({});
    Modal.getOrCreateInstance(subjectModalRef.current).show();
  };

  const closeSubjectModal = () => {
    Modal.getOrCreateInstance(subjectModalRef.current).hide();
  };

  const handleSubjectChange = (e) => {
    const { name, value } = e.target;
    setSubjectForm((prev) => ({ ...prev, [name]: value }));
    setSubjectErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.subject_name.trim()) {
      setSubjectErrors({ subject_name: "Subject Name is required." });
      return;
    }
    setSubmitting(true);
    try {
      const response = editingSubjectId
        ? await API.put(`/subjects/${editingSubjectId}`, subjectForm)
        : await API.post("/subjects", subjectForm);
      closeSubjectModal();
      await fetchSubjects();
      setToast({
        variant: "success",
        message: response.data.message || "Subject saved successfully",
      });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setSubjectErrors(serverErrors);
      } else {
        setToast({
          variant: "danger",
          message: err.response?.data?.message || "Failed to save subject.",
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
      await API.delete(`/subjects/${pendingDeleteId}`);
      Modal.getOrCreateInstance(deleteModalRef.current).hide();
      await fetchSubjects();
      setToast({ variant: "success", message: "Subject removed successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete subject.",
      });
    }
  };

  const openManageModal = (subject) => {
    setManageSubject(subject);
    setSubSubjectForm(initialSubSubjectForm);
    setEditingSubSubjectId(null);
    setSubSubjectErrors({});
    Modal.getOrCreateInstance(manageModalRef.current).show();
  };

  const refreshManageSubject = async () => {
    const response = await API.get("/subjects?active=true");
    setSubjects(response.data.data);
    const updated = response.data.data.find((s) => s.id === manageSubject.id);
    if (updated) setManageSubject(updated);
  };

  const handleSubSubjectChange = (e) => {
    const { name, value } = e.target;
    setSubSubjectForm((prev) => ({ ...prev, [name]: value }));
    setSubSubjectErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const startEditSubSubject = (subSubject) => {
    setEditingSubSubjectId(subSubject.id);
    setSubSubjectForm({
      sub_subject_name: subSubject.sub_subject_name || "",
      syllabus: subSubject.syllabus || "",
    });
    setSubSubjectErrors({});
  };

  const cancelEditSubSubject = () => {
    setEditingSubSubjectId(null);
    setSubSubjectForm(initialSubSubjectForm);
    setSubSubjectErrors({});
  };

  const handleSubSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subSubjectForm.sub_subject_name.trim()) {
      setSubSubjectErrors({
        sub_subject_name: "Sub-Subject Name is required.",
      });
      return;
    }
    try {
      const response = editingSubSubjectId
        ? await API.put(
            `/subjects/sub-subjects/${editingSubSubjectId}`,
            subSubjectForm
          )
        : await API.post(
            `/subjects/${manageSubject.id}/sub-subjects`,
            subSubjectForm
          );
      setSubSubjectForm(initialSubSubjectForm);
      setEditingSubSubjectId(null);
      await refreshManageSubject();
      setToast({
        variant: "success",
        message: response.data.message || "Sub-Subject saved successfully",
      });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setSubSubjectErrors(serverErrors);
      } else {
        setToast({
          variant: "danger",
          message:
            err.response?.data?.message || "Failed to save sub-subject.",
        });
      }
    }
  };

  const deleteSubSubject = async (id) => {
    if (!window.confirm("Remove this sub-subject?")) return;
    try {
      await API.delete(`/subjects/sub-subjects/${id}`);
      await refreshManageSubject();
      setToast({
        variant: "success",
        message: "Sub-Subject removed successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message:
          err.response?.data?.message || "Failed to delete sub-subject.",
      });
    }
  };

  const exportToExcel = () => {
    const data = filteredSubjects.map((s) => ({
      "Subject Name": s.subject_name,
      Description: s.description || "",
      "Sub-Subjects": (s.SubSubjects || [])
        .map((sub) => sub.sub_subject_name)
        .join(", "),
      Syllabus:
        (s.SubSubjects || []).length === 0
          ? s.syllabus || ""
          : (s.SubSubjects || [])
              .map((sub) => `${sub.sub_subject_name}: ${sub.syllabus || ""}`)
              .join(" | "),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subjects");
    XLSX.writeFile(workbook, "subjects.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const head = [["Subject Name", "Description", "Sub-Subjects", "Syllabus"]];
    const body = filteredSubjects.map((s) => [
      s.subject_name,
      s.description || "-",
      (s.SubSubjects || []).map((sub) => sub.sub_subject_name).join(", ") ||
        "-",
      (s.SubSubjects || []).length === 0
        ? s.syllabus || "-"
        : (s.SubSubjects || [])
            .map((sub) => `${sub.sub_subject_name}: ${sub.syllabus || ""}`)
            .join(" | "),
    ]);
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [29, 78, 216] },
    });
    doc.save("subjects.pdf");
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
    <div className="container-fluid" style={{ maxWidth: "1100px" }}>
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
                Total Subjects
              </div>
              <div className="fs-3 fw-bold text-primary">
                {subjects.length}
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase fw-bold">
                Total Sub-Subjects
              </div>
              <div className="fs-3 fw-bold text-info">{totalSubSubjects}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Subject Management</h4>
            <div className="d-flex gap-2 flex-wrap">
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
                className="btn btn-primary btn-sm"
                onClick={openAddSubjectModal}
              >
                <i className="bi bi-plus-lg me-1"></i> Add Subject
              </button>
            </div>
          </div>

          <div className="input-group mb-3" style={{ maxWidth: "350px" }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Subject Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Subject Name</th>
                  <th>Description</th>
                  <th>Sub-Subjects</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted py-4" colSpan={5}>
                      <i className="bi bi-inbox fs-3 d-block mb-2"></i>
                      No subjects found.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((s, index) => (
                    <tr key={s.id}>
                      <td>{index + 1}</td>
                      <td>{s.subject_name}</td>
                      <td>{s.description || "-"}</td>
                      <td>
                        <span className="badge bg-info">
                          {s.SubSubjects?.length || 0}
                        </span>
                      </td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Manage Sub-Subjects"
                          onClick={() => openManageModal(s)}
                        >
                          <i className="bi bi-diagram-3"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          title="Edit"
                          onClick={() => openEditSubjectModal(s)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Delete"
                          onClick={() => confirmDelete(s.id)}
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

      {/* Add/Edit Subject Modal */}
      <div
        className="modal fade"
        id="subjectModal"
        tabIndex="-1"
        ref={subjectModalRef}
      >
        <div className="modal-dialog modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingSubjectId ? "Edit Subject" : "Add Subject"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <form onSubmit={handleSubjectSubmit}>
              <div
                className="modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Subject Name</label>
                    <input
                      type="text"
                      name="subject_name"
                      className={`form-control ${subjectErrors.subject_name ? "is-invalid" : ""}`}
                      value={subjectForm.subject_name}
                      onChange={handleSubjectChange}
                    />
                    {subjectErrors.subject_name && (
                      <div className="invalid-feedback">
                        {subjectErrors.subject_name}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows={2}
                      value={subjectForm.description}
                      onChange={handleSubjectChange}
                    ></textarea>
                  </div>

                  {editingSubjectId &&
                  subjects.find((s) => s.id === editingSubjectId)
                    ?.SubSubjects?.length > 0 ? (
                    <div className="col-12">
                      <div className="alert alert-info small mb-0">
                        This subject has sub-subjects — add the syllabus
                        inside each sub-subject instead (use "Manage
                        Sub-Subjects").
                      </div>
                    </div>
                  ) : (
                    <div className="col-12">
                      <label className="form-label">Syllabus</label>
                      <textarea
                        name="syllabus"
                        className="form-control"
                        rows={3}
                        placeholder="Only used if this subject has no sub-subjects"
                        value={subjectForm.syllabus}
                        onChange={handleSubjectChange}
                      ></textarea>
                    </div>
                  )}
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

      {/* Manage Sub-Subjects Modal */}
      <div
        className="modal fade"
        id="manageSubSubjectsModal"
        tabIndex="-1"
        ref={manageModalRef}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Sub-Subjects — {manageSubject?.subject_name}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div
              className="modal-body"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <form
                onSubmit={handleSubSubjectSubmit}
                className="row g-2 align-items-end mb-4"
              >
                {editingSubSubjectId && (
                  <div className="col-12">
                    <div className="alert alert-warning py-2 px-3 mb-0 small">
                      Editing existing sub-subject. Click Cancel to add a new
                      one instead.
                    </div>
                  </div>
                )}
                <div className="col-md-4">
                  <label className="form-label">Sub-Subject Name</label>
                  <input
                    type="text"
                    name="sub_subject_name"
                    className={`form-control ${subSubjectErrors.sub_subject_name ? "is-invalid" : ""}`}
                    value={subSubjectForm.sub_subject_name}
                    onChange={handleSubSubjectChange}
                  />
                  {subSubjectErrors.sub_subject_name && (
                    <div className="invalid-feedback">
                      {subSubjectErrors.sub_subject_name}
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">Syllabus</label>
                  <input
                    type="text"
                    name="syllabus"
                    className="form-control"
                    value={subSubjectForm.syllabus}
                    onChange={handleSubSubjectChange}
                  />
                </div>
                <div className="col-md-2 d-flex gap-2">
                  <button type="submit" className="btn btn-primary flex-fill">
                    {editingSubSubjectId ? "Update" : "Add"}
                  </button>
                  {editingSubSubjectId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cancelEditSubSubject}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Sub-Subject Name</th>
                      <th>Syllabus</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(manageSubject?.SubSubjects || []).length === 0 ? (
                      <tr>
                        <td className="text-center text-muted" colSpan={3}>
                          No sub-subjects yet.
                        </td>
                      </tr>
                    ) : (
                      manageSubject.SubSubjects.map((sub) => (
                        <tr key={sub.id}>
                          <td>{sub.sub_subject_name}</td>
                          <td>{sub.syllabus || "-"}</td>
                          <td className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => startEditSubSubject(sub)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteSubSubject(sub.id)}
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
        id="subjectDeleteModal"
        tabIndex="-1"
        ref={deleteModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Remove Subject</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              Are you sure you want to remove this subject? Its sub-subjects
              will remain linked but hidden until restored.
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

export default SubjectManagement;
