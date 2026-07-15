import { useEffect, useRef, useState } from "react";
import { Modal } from "bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../../api/api";

const initialForm = {
  group_name: "",
  teacher_id: "",
  course_id: "",
};

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const getTodayName = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" });

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

const initialSlotForm = {
  group_id: "",
  startHour: "",
  startMinute: "",
  startPeriod: "",
  endHour: "",
  endMinute: "",
  endPeriod: "",
};

function GroupManagement() {
  const modalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const viewModalRef = useRef(null);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("group_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [viewGroup, setViewGroup] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const [weeklySchedules, setWeeklySchedules] = useState([]);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [expandedScheduleId, setExpandedScheduleId] = useState(null);
  const [activeDayForm, setActiveDayForm] = useState(null);
  const [slotForm, setSlotForm] = useState(initialSlotForm);
  const [findTodayResult, setFindTodayResult] = useState(null);

  const fetchWeeklySchedules = async () => {
    try {
      const response = await API.get("/weekly-schedules?active=true");
      setWeeklySchedules(response.data.data);
    } catch {
      // Weekly schedule list is a secondary feature here; ignore failures silently.
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await API.get("/groups?active=true");
      setGroups(response.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await API.get("/teachers?active=true");
      setTeachers(response.data.data);
    } catch {
      // Teacher list is a secondary feature here; ignore failures silently.
    }
  };

  const fetchAdmissions = async () => {
    try {
      const response = await API.get("/admissions?active=true");
      setAdmissions(response.data.data);
    } catch {
      // Student list is a secondary feature here; ignore failures silently.
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchTeachers();
    fetchAdmissions();
    fetchWeeklySchedules();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortOrder]);

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

  const summary = {
    total: groups.length,
  };

  const filteredGroups = groups.filter((g) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if ((g.group_name || "").toLowerCase().includes(term)) return true;
    if ((g.Teacher?.teacher_name || "").toLowerCase().includes(term))
      return true;
    return (g.Course?.course_name || "").toLowerCase().includes(term);
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    const result = valA.toString().localeCompare(valB.toString());
    return sortOrder === "asc" ? result : -result;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedGroups.length / ROWS_PER_PAGE)
  );
  const paginatedGroups = sortedGroups.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const selectedTeacher = teachers.find(
    (t) => String(t.id) === String(formData.teacher_id)
  );
  const selectedCourse = (selectedTeacher?.Courses || []).find(
    (c) => String(c.id) === String(formData.course_id)
  );
  const suggestedStudents = selectedCourse
    ? admissions.filter(
        (a) =>
          (a.course_name || "").trim().toLowerCase() ===
          (selectedCourse.course_name || "").trim().toLowerCase()
      )
    : [];
  const filteredSuggestedStudents = suggestedStudents.filter((a) => {
    if (!studentSearchTerm.trim()) return true;
    const term = studentSearchTerm.trim().toLowerCase();
    return (
      (a.applicant_name || "").toLowerCase().includes(term) ||
      (a.comn_enrol_no || "").toLowerCase().includes(term) ||
      (a.course_name || "").toLowerCase().includes(term)
    );
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
    setSelectedStudentIds([]);
    setStudentSearchTerm("");
    Modal.getOrCreateInstance(modalRef.current).show();
  };

  const openEditModal = (group) => {
    setEditingId(group.id);
    setFormData({
      group_name: group.group_name || "",
      teacher_id: group.teacher_id || "",
      course_id: group.course_id || "",
    });
    setFormErrors({});
    setSelectedStudentIds((group.Students || []).map((s) => s.id));
    setStudentSearchTerm("");
    Modal.getOrCreateInstance(modalRef.current).show();
  };

  const closeModal = () => {
    Modal.getOrCreateInstance(modalRef.current).hide();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "teacher_id" ? { course_id: "" } : {}),
    }));
    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (name === "teacher_id" || name === "course_id") {
      setSelectedStudentIds([]);
    }
  };

  const toggleStudentSelection = (admissionId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(admissionId)
        ? prev.filter((id) => id !== admissionId)
        : [...prev, admissionId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.group_name.trim())
      errors.group_name = "Group Name is required.";
    if (!formData.teacher_id) errors.teacher_id = "Teacher is required.";
    if (!formData.course_id) errors.course_id = "Course is required.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const response = editingId
        ? await API.put(`/groups/${editingId}`, formData)
        : await API.post("/groups", formData);
      const groupId = editingId || response.data.data.id;
      await API.put(`/groups/${groupId}/students`, {
        admission_ids: selectedStudentIds,
      });
      closeModal();
      await fetchGroups();
      setToast({ variant: "success", message: "Group saved successfully" });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setFormErrors(serverErrors);
      } else {
        setToast({
          variant: "danger",
          message: err.response?.data?.message || "Failed to save group.",
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
      await API.delete(`/groups/${pendingDeleteId}`);
      Modal.getOrCreateInstance(deleteModalRef.current).hide();
      await fetchGroups();
      setToast({ variant: "success", message: "Group removed successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete group.",
      });
    }
  };

  const openViewModal = (group) => {
    setViewGroup(group);
    Modal.getOrCreateInstance(viewModalRef.current).show();
  };

  const createWeeklySchedule = async () => {
    if (!newScheduleName.trim()) return;
    try {
      await API.post("/weekly-schedules", { schedule_name: newScheduleName });
      setNewScheduleName("");
      await fetchWeeklySchedules();
      setToast({
        variant: "success",
        message: "Weekly schedule created successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message:
          err.response?.data?.message || "Failed to create weekly schedule.",
      });
    }
  };

  const deleteWeeklySchedule = async (id) => {
    if (!window.confirm("Remove this weekly schedule?")) return;
    try {
      await API.delete(`/weekly-schedules/${id}`);
      if (expandedScheduleId === id) setExpandedScheduleId(null);
      await fetchWeeklySchedules();
      setToast({
        variant: "success",
        message: "Weekly schedule removed successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message:
          err.response?.data?.message || "Failed to delete weekly schedule.",
      });
    }
  };

  const toggleWeeklySchedule = async (schedule) => {
    try {
      await API.put(`/weekly-schedules/${schedule.id}/toggle`, {
        is_on: !schedule.is_on,
      });
      await fetchWeeklySchedules();
      setToast({
        variant: "success",
        message: !schedule.is_on
          ? `"${schedule.schedule_name}" turned ON — this is now the running schedule`
          : `"${schedule.schedule_name}" turned OFF`,
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to update schedule.",
      });
    }
  };

  const openDayForm = (scheduleId, day) => {
    setExpandedScheduleId(scheduleId);
    setActiveDayForm(day);
    setSlotForm(initialSlotForm);
  };

  const handleSlotFormChange = (e) => {
    const { name, value } = e.target;
    setSlotForm((prev) => ({ ...prev, [name]: value }));
  };

  const addSlot = async (scheduleId) => {
    if (!slotForm.group_id) {
      setToast({ variant: "danger", message: "Select a Group first." });
      return;
    }
    const { startHour, startMinute, startPeriod, endHour, endMinute, endPeriod } =
      slotForm;
    if (
      !startHour ||
      !startMinute ||
      !startPeriod ||
      !endHour ||
      !endMinute ||
      !endPeriod
    ) {
      setToast({
        variant: "danger",
        message: "Select Start Time and End Time (including AM/PM).",
      });
      return;
    }
    const timing = `${startHour}:${startMinute} ${startPeriod} - ${endHour}:${endMinute} ${endPeriod}`;
    try {
      await API.post(`/weekly-schedules/${scheduleId}/slots`, {
        day_of_week: activeDayForm,
        group_id: slotForm.group_id,
        timing,
      });
      setSlotForm(initialSlotForm);
      setActiveDayForm(null);
      await fetchWeeklySchedules();
      setToast({ variant: "success", message: "Added to schedule" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to add slot.",
      });
    }
  };

  const deleteSlot = async (slotId) => {
    try {
      await API.delete(`/weekly-schedules/slots/${slotId}`);
      await fetchWeeklySchedules();
      setToast({ variant: "success", message: "Removed from schedule" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to remove slot.",
      });
    }
  };

  const findTodayBatch = () => {
    const activeSchedule = weeklySchedules.find((s) => s.is_on);
    const today = getTodayName();
    if (!activeSchedule) {
      setFindTodayResult({ today, activeSchedule: null, slots: [] });
      return;
    }
    const slots = (activeSchedule.Slots || []).filter(
      (s) => s.day_of_week === today
    );
    setFindTodayResult({ today, activeSchedule, slots });
  };

  const exportToExcel = () => {
    const data = sortedGroups.map((g) => ({
      "Group Name": g.group_name,
      Teacher: g.Teacher?.teacher_name || "",
      Course: g.Course?.course_name || "",
      Students: (g.Students || []).length,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Groups");
    XLSX.writeFile(workbook, "groups.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const head = [["Group Name", "Teacher", "Course", "Students"]];
    const body = sortedGroups.map((g) => [
      g.group_name,
      g.Teacher?.teacher_name || "-",
      g.Course?.course_name || "-",
      (g.Students || []).length,
    ]);
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [29, 78, 216] },
    });
    doc.save("groups.pdf");
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
                Total Groups
              </div>
              <div className="fs-3 fw-bold text-primary">{summary.total}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Group Management</h4>
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
                onClick={openAddModal}
              >
                <i className="bi bi-plus-lg me-1"></i> Add Group
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
              placeholder="Search by Group Name, Teacher, or Course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th role="button" onClick={() => handleSort("group_name")}>
                    Group Name{" "}
                    <i className={`bi ${sortIcon("group_name")}`}></i>
                  </th>
                  <th>Teacher</th>
                  <th>Course</th>
                  <th>Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted py-4" colSpan={6}>
                      <i className="bi bi-inbox fs-3 d-block mb-2"></i>
                      No groups found.
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((g, index) => (
                    <tr key={g.id}>
                      <td>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</td>
                      <td>{g.group_name}</td>
                      <td>{g.Teacher?.teacher_name || "-"}</td>
                      <td>
                        {g.Course?.course_name ? (
                          <span className="badge bg-info text-dark">
                            {g.Course.course_name}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className="badge bg-warning text-dark">
                          {(g.Students || []).length}
                        </span>
                      </td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="View"
                          onClick={() => openViewModal(g)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          title="Edit"
                          onClick={() => openEditModal(g)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Delete"
                          onClick={() => confirmDelete(g.id)}
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

          <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-2">
            <span className="text-muted small">
              Showing{" "}
              {sortedGroups.length === 0
                ? 0
                : (currentPage - 1) * ROWS_PER_PAGE + 1}
              –
              {Math.min(currentPage * ROWS_PER_PAGE, sortedGroups.length)} of{" "}
              {sortedGroups.length} groups
            </span>

            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    « Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <li
                      key={page}
                      className={`page-item ${currentPage === page ? "active" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}
                <li
                  className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next »
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h4 className="mb-3">Seven Days Schedule</h4>

          <div className="d-flex align-items-start gap-2 mb-3 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={findTodayBatch}
            >
              <i className="bi bi-search me-1"></i> Find Today's Batch
            </button>
            {findTodayResult && (
              <div className="border rounded p-2 px-3 bg-light flex-grow-1">
                <strong>Today: {findTodayResult.today}</strong>
                {!findTodayResult.activeSchedule ? (
                  <div className="text-muted small">
                    No weekly schedule is turned ON right now.
                  </div>
                ) : findTodayResult.slots.length === 0 ? (
                  <div className="text-muted small">
                    No batches scheduled for today in "
                    {findTodayResult.activeSchedule.schedule_name}".
                  </div>
                ) : (
                  <ul className="mb-0 ps-3 small">
                    {findTodayResult.slots.map((slot) => (
                      <li key={slot.id}>
                        <strong>{slot.Group?.group_name}</strong> (
                        {slot.Group?.Teacher?.teacher_name},{" "}
                        {slot.Group?.Course?.course_name}) —{" "}
                        {slot.timing || "No timing set"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div
            className="input-group input-group-sm mb-3"
            style={{ maxWidth: "400px" }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="New Weekly Schedule name..."
              value={newScheduleName}
              onChange={(e) => setNewScheduleName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={createWeeklySchedule}
            >
              Add
            </button>
          </div>

          {weeklySchedules.length === 0 ? (
            <div className="text-muted small">
              No weekly schedules created yet. Create one above, then click
              "Manage Days" to add group timings for each day.
            </div>
          ) : (
            weeklySchedules.map((schedule) => (
              <div key={schedule.id} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <strong>{schedule.schedule_name}</strong>
                    {schedule.is_on && (
                      <span className="badge bg-success">ON — Running</span>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={schedule.is_on}
                        onChange={() => toggleWeeklySchedule(schedule)}
                      />
                      <label className="form-check-label small">
                        {schedule.is_on ? "ON" : "OFF"}
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() =>
                        setExpandedScheduleId(
                          expandedScheduleId === schedule.id
                            ? null
                            : schedule.id
                        )
                      }
                    >
                      {expandedScheduleId === schedule.id
                        ? "Hide Days"
                        : "Manage Days"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteWeeklySchedule(schedule.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                {expandedScheduleId === schedule.id && (
                  <div className="row g-2 mt-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const daySlots = (schedule.Slots || []).filter(
                        (s) => s.day_of_week === day
                      );
                      const isToday = day === getTodayName();
                      const isFormOpen =
                        activeDayForm === day &&
                        expandedScheduleId === schedule.id;
                      return (
                        <div className="col-6 col-md-3" key={day}>
                          <div
                            className={`border rounded p-2 h-100 ${isToday ? "border-primary border-2 bg-light" : ""}`}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <strong className="small">{day}</strong>
                              {isToday && (
                                <span className="badge bg-primary">
                                  Today
                                </span>
                              )}
                            </div>
                            {daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="small mt-1 border-top pt-1"
                              >
                                <div className="fw-semibold">
                                  {slot.Group?.group_name}
                                </div>
                                <div className="text-muted">
                                  {slot.Group?.Teacher?.teacher_name} —{" "}
                                  {slot.timing || "No timing"}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-danger p-0"
                                  onClick={() => deleteSlot(slot.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            {isFormOpen ? (
                              <div className="mt-2 border-top pt-2">
                                <select
                                  name="group_id"
                                  className="form-select form-select-sm mb-1"
                                  value={slotForm.group_id}
                                  onChange={handleSlotFormChange}
                                >
                                  <option value="">-- Group --</option>
                                  {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.group_name}
                                    </option>
                                  ))}
                                </select>
                                <label className="form-label small mb-1 mt-1">
                                  Start Time
                                </label>
                                <div className="d-flex gap-1 mb-1">
                                  <select
                                    name="startHour"
                                    className="form-select form-select-sm"
                                    value={slotForm.startHour}
                                    onChange={handleSlotFormChange}
                                  >
                                    <option value="">HH</option>
                                    {HOURS.map((h) => (
                                      <option key={h} value={h}>
                                        {h}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    name="startMinute"
                                    className="form-select form-select-sm"
                                    value={slotForm.startMinute}
                                    onChange={handleSlotFormChange}
                                  >
                                    <option value="">MM</option>
                                    {MINUTES.map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    name="startPeriod"
                                    className="form-select form-select-sm"
                                    value={slotForm.startPeriod}
                                    onChange={handleSlotFormChange}
                                  >
                                    <option value="">--</option>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </div>
                                <label className="form-label small mb-1">
                                  End Time
                                </label>
                                <div className="d-flex gap-1 mb-1">
                                  <select
                                    name="endHour"
                                    className="form-select form-select-sm"
                                    value={slotForm.endHour}
                                    onChange={handleSlotFormChange}
                                  >
                                    <option value="">HH</option>
                                    {HOURS.map((h) => (
                                      <option key={h} value={h}>
                                        {h}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    name="endMinute"
                                    className="form-select form-select-sm"
                                    value={slotForm.endMinute}
                                    onChange={handleSlotFormChange}
                                  >
                                    <option value="">MM</option>
                                    {MINUTES.map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    name="endPeriod"
                                    className="form-select form-select-sm"
                                    value={slotForm.endPeriod}
                                    onChange={handleSlotFormChange}
                                  >
                                    <option value="">--</option>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </div>
                                <div className="d-flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary flex-fill"
                                    onClick={() => addSlot(schedule.id)}
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setActiveDayForm(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary w-100 mt-2"
                                onClick={() =>
                                  openDayForm(schedule.id, day)
                                }
                              >
                                + Add Group
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Group Modal */}
      <div className="modal fade" id="groupModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingId ? "Edit Group" : "Add Group"}
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
                    <label className="form-label">Teacher</label>
                    <select
                      name="teacher_id"
                      className={`form-select ${formErrors.teacher_id ? "is-invalid" : ""}`}
                      value={formData.teacher_id}
                      onChange={handleChange}
                    >
                      <option value="">-- Select Teacher --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teacher_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.teacher_id && (
                      <div className="invalid-feedback">
                        {formErrors.teacher_id}
                      </div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Course</label>
                    <select
                      name="course_id"
                      className={`form-select ${formErrors.course_id ? "is-invalid" : ""}`}
                      value={formData.course_id}
                      onChange={handleChange}
                      disabled={!selectedTeacher}
                    >
                      <option value="">
                        {selectedTeacher
                          ? "-- Select Course --"
                          : "Select a Teacher first"}
                      </option>
                      {(selectedTeacher?.Courses || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.course_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.course_id && (
                      <div className="invalid-feedback">
                        {formErrors.course_id}
                      </div>
                    )}
                    {selectedTeacher &&
                      (selectedTeacher.Courses || []).length === 0 && (
                        <div className="form-text text-warning">
                          This teacher has no courses assigned in Teacher
                          Management.
                        </div>
                      )}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Group Name</label>
                    <input
                      type="text"
                      name="group_name"
                      className={`form-control ${formErrors.group_name ? "is-invalid" : ""}`}
                      placeholder="e.g. DCA Morning Group"
                      value={formData.group_name}
                      onChange={handleChange}
                    />
                    {formErrors.group_name && (
                      <div className="invalid-feedback">
                        {formErrors.group_name}
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label d-block">
                      Students in this Group
                    </label>
                    {!formData.course_id ? (
                      <div className="text-muted small">
                        Select a Teacher and Course first — students admitted
                        in that course will be suggested here.
                      </div>
                    ) : suggestedStudents.length === 0 ? (
                      <div className="text-muted small">
                        No admitted students found for this course.
                      </div>
                    ) : (
                      <div className="border rounded p-2">
                        <div className="input-group input-group-sm mb-2">
                          <span className="input-group-text bg-white">
                            <i className="bi bi-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search student by name, enrolment no, or course..."
                            value={studentSearchTerm}
                            onChange={(e) =>
                              setStudentSearchTerm(e.target.value)
                            }
                          />
                        </div>
                        {filteredSuggestedStudents.length === 0 ? (
                          <div className="text-muted small">
                            No students match your search.
                          </div>
                        ) : (
                          <div className="row g-2">
                            {filteredSuggestedStudents.map((a) => (
                              <div className="col-md-4" key={a.id}>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedStudentIds.includes(
                                      a.id
                                    )}
                                    onChange={() =>
                                      toggleStudentSelection(a.id)
                                    }
                                  />
                                  <label className="form-check-label">
                                    {a.applicant_name}
                                    {a.comn_enrol_no && (
                                      <span className="text-muted small">
                                        {" "}
                                        ({a.comn_enrol_no})
                                      </span>
                                    )}
                                    <span className="text-muted small d-block">
                                      {a.course_name}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
      <div className="modal fade" id="groupViewModal" tabIndex="-1" ref={viewModalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Group Details</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              {viewGroup && (
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">
                      Group Name
                    </div>
                    <div>{viewGroup.group_name}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">
                      Teacher
                    </div>
                    <div>{viewGroup.Teacher?.teacher_name || "-"}</div>
                  </div>
                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">
                      Course
                    </div>
                    <div>
                      {viewGroup.Course?.course_name ? (
                        <span className="badge bg-info text-dark">
                          {viewGroup.Course.course_name}
                        </span>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">
                      Students ({(viewGroup.Students || []).length})
                    </div>
                    {(viewGroup.Students || []).length === 0 ? (
                      <div className="text-muted">
                        No students added to this group yet.
                      </div>
                    ) : (
                      <ol className="mb-0 ps-3">
                        {viewGroup.Students.map((s) => (
                          <li key={s.id}>
                            {s.applicant_name}
                            {s.comn_enrol_no && (
                              <span className="text-muted">
                                {" "}
                                — {s.comn_enrol_no}
                              </span>
                            )}
                            {s.mobile_no && ` — ${s.mobile_no}`}
                          </li>
                        ))}
                      </ol>
                    )}
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
        id="groupDeleteModal"
        tabIndex="-1"
        ref={deleteModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Remove Group</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              Are you sure you want to remove this group?
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

export default GroupManagement;
