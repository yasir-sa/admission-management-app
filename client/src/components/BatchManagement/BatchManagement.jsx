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
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ date: "", description: "" });
  const [teacherStatus, setTeacherStatus] = useState({
    available: [],
    nonAvailable: [],
  });
  const [substituteForm, setSubstituteForm] = useState({});
  const [activeConcept, setActiveConcept] = useState("concept1");

  // --- Concept 2: Section-based Batch scheduling ---
  const batchModalRef = useRef(null);
  const batchDeleteModalRef = useRef(null);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batchEditingId, setBatchEditingId] = useState(null);
  const initialBatchForm = {
    batch_name: "",
    section: "",
    subject_id: "",
    sub_subject_id: "",
    startHour: "",
    startMinute: "",
    startPeriod: "",
    endHour: "",
    endMinute: "",
    endPeriod: "",
    num_days: "",
    teacher_id: "",
  };
  const [batchForm, setBatchForm] = useState(initialBatchForm);
  const [batchFormErrors, setBatchFormErrors] = useState({});
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchTeacherOptions, setBatchTeacherOptions] = useState([]);
  const [batchStudentOptions, setBatchStudentOptions] = useState([]);
  const [batchSelectedStudentIds, setBatchSelectedStudentIds] = useState([]);
  const [pendingBatchDeleteId, setPendingBatchDeleteId] = useState(null);
  const [subjectTeachersCache, setSubjectTeachersCache] = useState({});
  const [batchSubstituteForm, setBatchSubstituteForm] = useState({});
  const [batchSearchTerm, setBatchSearchTerm] = useState("");
  const [batchSortField, setBatchSortField] = useState("batch_name");
  const [batchSortOrder, setBatchSortOrder] = useState("asc");
  const [batchCurrentPage, setBatchCurrentPage] = useState(1);
  const BATCH_ROWS_PER_PAGE = 10;

  const SECTIONS = [
    { key: "fast_track", label: "Fast Track (Every Day)" },
    { key: "normal_mwf", label: "Normal Track (Mon/Wed/Fri)" },
    { key: "normal_tts", label: "Normal Track (Tue/Thu/Sat)" },
    { key: "weekend", label: "Weekend (Saturday)" },
  ];
  const SECTION_LABEL_BY_KEY = Object.fromEntries(
    SECTIONS.map((s) => [s.key, s.label])
  );

  const filteredBatchesTable = batches.filter((b) => {
    if (!batchSearchTerm.trim()) return true;
    const term = batchSearchTerm.toLowerCase();
    if ((b.batch_name || "").toLowerCase().includes(term)) return true;
    if ((b.Teacher?.teacher_name || "").toLowerCase().includes(term)) return true;
    if ((b.Subject?.subject_name || "").toLowerCase().includes(term)) return true;
    return (SECTION_LABEL_BY_KEY[b.section] || "").toLowerCase().includes(term);
  });

  const sortedBatchesTable = [...filteredBatchesTable].sort((a, b) => {
    const valA =
      batchSortField === "teacher"
        ? a.Teacher?.teacher_name || ""
        : batchSortField === "subject"
          ? a.Subject?.subject_name || ""
          : a[batchSortField] ?? "";
    const valB =
      batchSortField === "teacher"
        ? b.Teacher?.teacher_name || ""
        : batchSortField === "subject"
          ? b.Subject?.subject_name || ""
          : b[batchSortField] ?? "";
    const result = valA.toString().localeCompare(valB.toString());
    return batchSortOrder === "asc" ? result : -result;
  });

  const batchTotalPages = Math.max(
    1,
    Math.ceil(sortedBatchesTable.length / BATCH_ROWS_PER_PAGE)
  );
  const paginatedBatchesTable = sortedBatchesTable.slice(
    (batchCurrentPage - 1) * BATCH_ROWS_PER_PAGE,
    batchCurrentPage * BATCH_ROWS_PER_PAGE
  );

  const handleBatchSort = (field) => {
    if (batchSortField === field) {
      setBatchSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setBatchSortField(field);
      setBatchSortOrder("asc");
    }
  };

  const batchSortIcon = (field) => {
    if (batchSortField !== field) return "bi-arrow-down-up text-muted";
    return batchSortOrder === "asc" ? "bi-sort-up" : "bi-sort-down";
  };

  const fetchBatches = async () => {
    try {
      const response = await API.get("/batches?active=true");
      setBatches(response.data.data);
      const subjectIds = [
        ...new Set(response.data.data.map((b) => b.subject_id).filter(Boolean)),
      ];
      const results = await Promise.all(
        subjectIds.map((id) =>
          API.get(`/batches/subject-teachers/${id}`)
            .then((res) => [id, res.data.data])
            .catch(() => [id, []])
        )
      );
      setSubjectTeachersCache((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    } catch {
      // Batch list is a secondary feature here; ignore failures silently.
    }
  };

  const assignSubstituteForBatch = async (batchId) => {
    const substituteTeacherId = batchSubstituteForm[batchId];
    if (!substituteTeacherId) {
      setToast({ variant: "danger", message: "Pick a substitute teacher first." });
      return;
    }
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const response = await API.put(`/batches/${batchId}/substitute`, {
        date: todayStr,
        substitute_teacher_id: substituteTeacherId,
      });
      setBatchSubstituteForm((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
      await fetchBatches();
      setToast({ variant: "success", message: response.data.message });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to set substitute.",
      });
    }
  };

  const removeSubstituteForBatch = async (batchId) => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      await API.delete(`/batches/${batchId}/substitute`, {
        params: { date: todayStr },
      });
      await fetchBatches();
      setToast({
        variant: "success",
        message: "Substitute removed — original teacher continues.",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to remove substitute.",
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await API.get("/subjects?active=true");
      setSubjects(response.data.data);
    } catch {
      // Subject list is a secondary feature here; ignore failures silently.
    }
  };

  const selectedBatchSubject = subjects.find(
    (s) => String(s.id) === String(batchForm.subject_id)
  );
  const batchSubSubjects = selectedBatchSubject?.SubSubjects || [];
  const effectiveBatchSubjectId =
    batchForm.sub_subject_id || batchForm.subject_id;

  const batchTiming =
    batchForm.startHour &&
    batchForm.startMinute &&
    batchForm.startPeriod &&
    batchForm.endHour &&
    batchForm.endMinute &&
    batchForm.endPeriod
      ? `${batchForm.startHour}:${batchForm.startMinute} ${batchForm.startPeriod} - ${batchForm.endHour}:${batchForm.endMinute} ${batchForm.endPeriod}`
      : "";

  useEffect(() => {
    if (!effectiveBatchSubjectId) {
      setBatchTeacherOptions([]);
      return;
    }
    API.get(`/batches/subject-teachers/${effectiveBatchSubjectId}`)
      .then((res) => setBatchTeacherOptions(res.data.data))
      .catch(() => setBatchTeacherOptions([]));
  }, [effectiveBatchSubjectId]);

  useEffect(() => {
    if (!effectiveBatchSubjectId) {
      setBatchStudentOptions([]);
      return;
    }
    API.get("/batches/subject-students", {
      params: { subjectId: effectiveBatchSubjectId },
    })
      .then((res) => setBatchStudentOptions(res.data.data))
      .catch(() => setBatchStudentOptions([]));
  }, [effectiveBatchSubjectId]);

  const openAddBatchModal = () => {
    setBatchEditingId(null);
    setBatchForm(initialBatchForm);
    setBatchFormErrors({});
    setBatchSelectedStudentIds([]);
    Modal.getOrCreateInstance(batchModalRef.current).show();
  };

  const openEditBatchModal = (batch) => {
    setBatchEditingId(batch.id);
    const [start, end] = (batch.timing || "").split(" - ");
    const [sh, rest] = (start || "").split(":");
    const [sm, sp] = (rest || "").split(" ");
    const [eh, restE] = (end || "").split(":");
    const [em, ep] = (restE || "").split(" ");
    const parentSubject = subjects.find((s) =>
      (s.SubSubjects || []).some((sub) => sub.id === batch.Subject?.id)
    );
    setBatchForm({
      batch_name: batch.batch_name || "",
      section: batch.section || "",
      subject_id: parentSubject ? String(parentSubject.id) : String(batch.subject_id),
      sub_subject_id: parentSubject ? String(batch.subject_id) : "",
      startHour: sh || "",
      startMinute: sm || "",
      startPeriod: sp || "",
      endHour: eh || "",
      endMinute: em || "",
      endPeriod: ep || "",
      num_days: batch.num_days ?? "",
      teacher_id: String(batch.teacher_id || ""),
    });
    setBatchFormErrors({});
    setBatchSelectedStudentIds((batch.Students || []).map((s) => s.id));
    Modal.getOrCreateInstance(batchModalRef.current).show();
  };

  const closeBatchModal = () => {
    Modal.getOrCreateInstance(batchModalRef.current).hide();
  };

  const handleBatchFormChange = (e) => {
    const { name, value } = e.target;
    setBatchForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "subject_id" ? { sub_subject_id: "", teacher_id: "" } : {}),
      ...(name === "sub_subject_id" ? { teacher_id: "" } : {}),
    }));
    setBatchFormErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const toggleBatchStudentSelection = (admissionId) => {
    setBatchSelectedStudentIds((prev) =>
      prev.includes(admissionId)
        ? prev.filter((id) => id !== admissionId)
        : [...prev, admissionId]
    );
  };

  const submitBatch = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!batchForm.batch_name.trim()) errors.batch_name = "Batch Name is required.";
    if (!batchForm.section) errors.section = "Section is required.";
    if (!batchForm.subject_id) errors.subject_id = "Subject is required.";
    if (batchSubSubjects.length > 0 && !batchForm.sub_subject_id)
      errors.sub_subject_id = "Sub-Subject is required.";
    if (!batchForm.teacher_id) errors.teacher_id = "Teacher is required.";
    if (!batchTiming) errors.timing = "Start Time and End Time are required.";
    if (Object.keys(errors).length > 0) {
      setBatchFormErrors(errors);
      return;
    }

    setBatchSubmitting(true);
    try {
      const payload = {
        batch_name: batchForm.batch_name,
        section: batchForm.section,
        subject_id: effectiveBatchSubjectId,
        teacher_id: batchForm.teacher_id,
        timing: batchTiming,
        num_days: batchForm.num_days,
        admission_ids: batchSelectedStudentIds,
      };
      if (batchEditingId) {
        await API.put(`/batches/${batchEditingId}`, payload);
      } else {
        await API.post("/batches", payload);
      }
      closeBatchModal();
      await fetchBatches();
      setToast({ variant: "success", message: "Batch saved successfully" });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setBatchFormErrors(serverErrors);
      } else {
        setToast({
          variant: "danger",
          message: err.response?.data?.message || "Failed to save batch.",
        });
      }
    } finally {
      setBatchSubmitting(false);
    }
  };

  const confirmDeleteBatch = (id) => {
    setPendingBatchDeleteId(id);
    Modal.getOrCreateInstance(batchDeleteModalRef.current).show();
  };

  const handleDeleteBatch = async () => {
    try {
      await API.delete(`/batches/${pendingBatchDeleteId}`);
      Modal.getOrCreateInstance(batchDeleteModalRef.current).hide();
      await fetchBatches();
      setToast({ variant: "success", message: "Batch removed successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete batch.",
      });
    }
  };

  const [draggedBatchId, setDraggedBatchId] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);

  const moveBatchToSection = async (batchId, newSection) => {
    try {
      await API.patch(`/batches/${batchId}/section`, { section: newSection });
      await fetchBatches();
      setToast({ variant: "success", message: "Batch moved successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to move batch.",
      });
    }
  };

  const fetchWeeklySchedules = async () => {
    try {
      const response = await API.get("/weekly-schedules?active=true");
      setWeeklySchedules(response.data.data);
    } catch {
      // Weekly schedule list is a secondary feature here; ignore failures silently.
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await API.get("/holidays");
      setHolidays(response.data.data);
    } catch {
      // Holiday list is a secondary feature here; ignore failures silently.
    }
  };

  const fetchTeacherStatus = async () => {
    try {
      const response = await API.get("/teacher-availability/today");
      setTeacherStatus(response.data.data);
    } catch {
      // Teacher availability list is a secondary feature here; ignore failures silently.
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
    fetchHolidays();
    fetchTeacherStatus();
    fetchBatches();
    fetchSubjects();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortOrder]);

  useEffect(() => {
    setBatchCurrentPage(1);
  }, [batchSearchTerm, batchSortField, batchSortOrder]);

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
    const batchModalEl = batchModalRef.current;
    const batchDeleteModalEl = batchDeleteModalRef.current;
    if (!modalEl || !deleteModalEl || !viewModalEl || !batchModalEl || !batchDeleteModalEl)
      return;
    const allModals = [modalEl, deleteModalEl, viewModalEl, batchModalEl, batchDeleteModalEl];
    allModals.forEach((el) => el.addEventListener("hidden.bs.modal", forceCleanup));
    return () => {
      allModals.forEach((el) =>
        el.removeEventListener("hidden.bs.modal", forceCleanup)
      );
    };
  }, [loading]);

  const summary = {
    total: groups.length,
  };

  const nonAvailableTeacherIds = new Set(
    teacherStatus.nonAvailable.map((t) => t.id)
  );

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

  const todayStr = new Date().toISOString().slice(0, 10);

  const assignSubstitute = async (slotId) => {
    const substituteTeacherId = substituteForm[slotId];
    if (!substituteTeacherId) {
      setToast({ variant: "danger", message: "Pick a substitute teacher first." });
      return;
    }
    try {
      const response = await API.put(
        `/weekly-schedules/slots/${slotId}/substitute`,
        { date: todayStr, substitute_teacher_id: substituteTeacherId }
      );
      setSubstituteForm((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      await fetchWeeklySchedules();
      setToast({ variant: "success", message: response.data.message });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to set substitute.",
      });
    }
  };

  const removeSubstitute = async (slotId) => {
    try {
      await API.delete(`/weekly-schedules/slots/${slotId}/substitute`, {
        params: { date: todayStr },
      });
      await fetchWeeklySchedules();
      setToast({
        variant: "success",
        message: "Substitute removed — original teacher continues.",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to remove substitute.",
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

  const addHoliday = async () => {
    if (!holidayForm.date) {
      setToast({ variant: "danger", message: "Select a date first." });
      return;
    }
    try {
      await API.post("/holidays", holidayForm);
      setHolidayForm({ date: "", description: "" });
      await fetchHolidays();
      setToast({ variant: "success", message: "Holiday added successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to add holiday.",
      });
    }
  };

  const deleteHoliday = async (id) => {
    if (!window.confirm("Remove this holiday?")) return;
    try {
      await API.delete(`/holidays/${id}`);
      await fetchHolidays();
      setToast({ variant: "success", message: "Holiday removed successfully" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete holiday.",
      });
    }
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

      <div className="btn-group mb-4" role="group">
        <button
          type="button"
          className={`btn ${activeConcept === "concept1" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveConcept("concept1")}
        >
          Concept 1
        </button>
        <button
          type="button"
          className={`btn ${activeConcept === "concept2" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveConcept("concept2")}
        >
          Concept 2
        </button>
      </div>

      {activeConcept === "concept2" && (
        <>
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h4 className="mb-0">Batch Scheduling — by Section</h4>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openAddBatchModal}
              >
                <i className="bi bi-plus-lg me-1"></i> Add Batch
              </button>
            </div>

            <div className="row g-3">
              {SECTIONS.map((section) => {
                const sectionBatches = batches.filter(
                  (b) => b.section === section.key
                );
                return (
                  <div className="col-md-6 col-lg-3" key={section.key}>
                    <div
                      className={`border rounded p-2 h-100 ${dragOverSection === section.key ? "border-primary border-2 bg-light" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverSection(section.key);
                      }}
                      onDragLeave={() => setDragOverSection(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverSection(null);
                        if (draggedBatchId) {
                          moveBatchToSection(draggedBatchId, section.key);
                        }
                        setDraggedBatchId(null);
                      }}
                    >
                      <h6 className="mb-2">{section.label}</h6>
                      {sectionBatches.length === 0 ? (
                        <div className="text-muted small">No batches yet.</div>
                      ) : (
                        sectionBatches.map((b) => (
                          <div
                            key={b.id}
                            draggable
                            onDragStart={() => setDraggedBatchId(b.id)}
                            onDragEnd={() => setDraggedBatchId(null)}
                            className="border rounded p-2 mb-2 small bg-light"
                            style={{ cursor: "grab" }}
                          >
                            <div className="fw-semibold">
                              {b.batch_name}
                              {b.section_active_today && b.BatchSession?.ended_at && (
                                <span className="badge bg-secondary ms-2">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Class Completed
                                </span>
                              )}
                              {b.section_active_today &&
                                b.BatchSession?.started_at &&
                                !b.BatchSession?.ended_at && (
                                  <span className="ms-2" title="Class in progress">
                                    <span
                                      className="d-inline-block rounded-circle bg-success"
                                      style={{ width: "8px", height: "8px" }}
                                    ></span>
                                    <span className="text-success small ms-1">Live</span>
                                  </span>
                                )}
                            </div>
                            <div className="text-muted">
                              {b.Subject?.subject_name || "-"}
                            </div>
                            <div>{b.Teacher?.teacher_name || "-"}</div>
                            <div>{b.timing}</div>
                            <div className="text-muted">
                              {b.num_days ? `${b.num_days} days` : ""}
                            </div>
                            <span className="badge bg-warning text-dark">
                              {(b.Students || []).length} students
                            </span>

                            {b.Substitutions?.[0] ? (
                              <div className="alert alert-warning py-1 px-2 mt-1 mb-1 small">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Substitute teacher set:{" "}
                                <strong>
                                  {b.Substitutions[0].SubstituteTeacher?.teacher_name}
                                </strong>{" "}
                                (today only)
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-danger p-0 ms-2"
                                  onClick={() => removeSubstituteForBatch(b.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              b.section_active_today &&
                              nonAvailableTeacherIds.has(b.teacher_id) && (
                                <div className="mt-1">
                                  <div className="text-danger small">
                                    <i className="bi bi-person-x me-1"></i>
                                    {b.Teacher?.teacher_name} is not available today.
                                  </div>
                                  <div className="d-flex gap-1 mt-1">
                                    <select
                                      className="form-select form-select-sm"
                                      value={batchSubstituteForm[b.id] || ""}
                                      onChange={(e) =>
                                        setBatchSubstituteForm((prev) => ({
                                          ...prev,
                                          [b.id]: e.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">-- Pick substitute --</option>
                                      {(subjectTeachersCache[b.subject_id] || [])
                                        .filter(
                                          (t) =>
                                            t.id !== b.teacher_id &&
                                            !nonAvailableTeacherIds.has(t.id)
                                        )
                                        .map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.teacher_name}
                                          </option>
                                        ))}
                                    </select>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-warning text-nowrap"
                                      onClick={() => assignSubstituteForBatch(b.id)}
                                    >
                                      Assign
                                    </button>
                                  </div>
                                </div>
                              )
                            )}

                            <div className="d-flex gap-1 mt-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEditBatchModal(b)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => confirmDeleteBatch(b.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <h4 className="mb-3">All Batches</h4>
            <div className="input-group mb-3" style={{ maxWidth: "350px" }}>
              <span className="input-group-text bg-white">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by Batch Name, Teacher, Subject, or Section..."
                value={batchSearchTerm}
                onChange={(e) => setBatchSearchTerm(e.target.value)}
              />
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle">
                <thead className="table-primary">
                  <tr>
                    <th>#</th>
                    <th role="button" onClick={() => handleBatchSort("batch_name")}>
                      Batch Name <i className={`bi ${batchSortIcon("batch_name")}`}></i>
                    </th>
                    <th role="button" onClick={() => handleBatchSort("subject")}>
                      Subject <i className={`bi ${batchSortIcon("subject")}`}></i>
                    </th>
                    <th role="button" onClick={() => handleBatchSort("teacher")}>
                      Teacher <i className={`bi ${batchSortIcon("teacher")}`}></i>
                    </th>
                    <th role="button" onClick={() => handleBatchSort("section")}>
                      Section <i className={`bi ${batchSortIcon("section")}`}></i>
                    </th>
                    <th>Timing</th>
                    <th>Students</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBatchesTable.length === 0 ? (
                    <tr>
                      <td className="text-center text-muted py-4" colSpan={8}>
                        <i className="bi bi-inbox fs-3 d-block mb-2"></i>
                        No batches found.
                      </td>
                    </tr>
                  ) : (
                    paginatedBatchesTable.map((b, index) => (
                      <tr key={b.id}>
                        <td>{(batchCurrentPage - 1) * BATCH_ROWS_PER_PAGE + index + 1}</td>
                        <td>{b.batch_name}</td>
                        <td>{b.Subject?.subject_name || "-"}</td>
                        <td>{b.Teacher?.teacher_name || "-"}</td>
                        <td>
                          <span className="badge bg-info text-dark">
                            {SECTION_LABEL_BY_KEY[b.section] || b.section}
                          </span>
                        </td>
                        <td>{b.timing}</td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {(b.Students || []).length}
                          </span>
                        </td>
                        <td className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            title="Edit"
                            onClick={() => openEditBatchModal(b)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Delete"
                            onClick={() => confirmDeleteBatch(b.id)}
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
                {sortedBatchesTable.length === 0
                  ? 0
                  : (batchCurrentPage - 1) * BATCH_ROWS_PER_PAGE + 1}
                –
                {Math.min(batchCurrentPage * BATCH_ROWS_PER_PAGE, sortedBatchesTable.length)} of{" "}
                {sortedBatchesTable.length} batches
              </span>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${batchCurrentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setBatchCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      « Previous
                    </button>
                  </li>
                  {Array.from({ length: batchTotalPages }, (_, i) => i + 1).map((page) => (
                    <li
                      key={page}
                      className={`page-item ${batchCurrentPage === page ? "active" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setBatchCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </li>
                  ))}
                  <li
                    className={`page-item ${batchCurrentPage === batchTotalPages ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        setBatchCurrentPage((p) => Math.min(batchTotalPages, p + 1))
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
            <h4 className="mb-3">Today's Teacher Availability</h4>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="fw-bold text-success mb-2">
                  <i className="bi bi-check-circle me-1"></i>
                  Available Today ({teacherStatus.available.length})
                </div>
                {teacherStatus.available.length === 0 ? (
                  <div className="text-muted small">No teachers found.</div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {teacherStatus.available.map((t) => (
                      <span key={t.id} className="badge bg-success">
                        {t.teacher_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <div className="fw-bold text-danger mb-2">
                  <i className="bi bi-x-circle me-1"></i>
                  Not Available Today ({teacherStatus.nonAvailable.length})
                </div>
                {teacherStatus.nonAvailable.length === 0 ? (
                  <div className="text-muted small">Everyone is available today.</div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {teacherStatus.nonAvailable.map((t) => (
                      <div key={t.id} className="small">
                        <span className="badge bg-danger me-1">{t.teacher_name}</span>
                        <span className="text-muted">{t.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <h4 className="mb-3">Holidays</h4>
            <div className="text-muted small mb-3">
              Mark a date as a holiday — no batch classes can be started/ended that day.
            </div>
            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-3">
                <label className="form-label small mb-1">Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={holidayForm.date}
                  onChange={(e) =>
                    setHolidayForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="col-md-5">
                <label className="form-label small mb-1">Description (optional)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Diwali Holiday"
                  value={holidayForm.description}
                  onChange={(e) =>
                    setHolidayForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm w-100"
                  onClick={addHoliday}
                >
                  Add Holiday
                </button>
              </div>
            </div>
            {holidays.length === 0 ? (
              <div className="text-muted small">No holidays marked yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => (
                      <tr key={h.id}>
                        <td>{h.date}</td>
                        <td>{h.description || "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteHoliday(h.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Add/Edit Batch Modal */}
      <div className="modal fade" tabIndex="-1" ref={batchModalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {batchEditingId ? "Edit Batch" : "Add Batch"}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={submitBatch}>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Batch Name</label>
                    <input
                      type="text"
                      name="batch_name"
                      className={`form-control ${batchFormErrors.batch_name ? "is-invalid" : ""}`}
                      value={batchForm.batch_name}
                      onChange={handleBatchFormChange}
                    />
                    {batchFormErrors.batch_name && (
                      <div className="invalid-feedback">{batchFormErrors.batch_name}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Section</label>
                    <select
                      name="section"
                      className={`form-select ${batchFormErrors.section ? "is-invalid" : ""}`}
                      value={batchForm.section}
                      onChange={handleBatchFormChange}
                    >
                      <option value="">-- Select Section --</option>
                      {SECTIONS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {batchFormErrors.section && (
                      <div className="invalid-feedback">{batchFormErrors.section}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Subject</label>
                    <select
                      name="subject_id"
                      className={`form-select ${batchFormErrors.subject_id ? "is-invalid" : ""}`}
                      value={batchForm.subject_id}
                      onChange={handleBatchFormChange}
                    >
                      <option value="">-- Select Subject --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_name}
                        </option>
                      ))}
                    </select>
                    {batchFormErrors.subject_id && (
                      <div className="invalid-feedback">{batchFormErrors.subject_id}</div>
                    )}
                  </div>
                  {batchSubSubjects.length > 0 && (
                    <div className="col-md-6">
                      <label className="form-label">Sub-Subject</label>
                      <select
                        name="sub_subject_id"
                        className={`form-select ${batchFormErrors.sub_subject_id ? "is-invalid" : ""}`}
                        value={batchForm.sub_subject_id}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">-- Select Sub-Subject --</option>
                        {batchSubSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.subject_name}
                          </option>
                        ))}
                      </select>
                      {batchFormErrors.sub_subject_id && (
                        <div className="invalid-feedback">{batchFormErrors.sub_subject_id}</div>
                      )}
                    </div>
                  )}

                  <div className="col-md-4">
                    <label className="form-label">Number of Days</label>
                    <input
                      type="number"
                      name="num_days"
                      min="1"
                      className="form-control"
                      placeholder="e.g. 5"
                      value={batchForm.num_days}
                      onChange={handleBatchFormChange}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Start Time</label>
                    <div className="d-flex gap-1 mb-1">
                      <select
                        name="startHour"
                        className="form-select form-select-sm"
                        value={batchForm.startHour}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">HH</option>
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        name="startMinute"
                        className="form-select form-select-sm"
                        value={batchForm.startMinute}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">MM</option>
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        name="startPeriod"
                        className="form-select form-select-sm"
                        value={batchForm.startPeriod}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">--</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    <label className="form-label">End Time</label>
                    <div className="d-flex gap-1">
                      <select
                        name="endHour"
                        className="form-select form-select-sm"
                        value={batchForm.endHour}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">HH</option>
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        name="endMinute"
                        className="form-select form-select-sm"
                        value={batchForm.endMinute}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">MM</option>
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        name="endPeriod"
                        className="form-select form-select-sm"
                        value={batchForm.endPeriod}
                        onChange={handleBatchFormChange}
                      >
                        <option value="">--</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {batchFormErrors.timing && (
                      <div className="text-danger small mt-1">{batchFormErrors.timing}</div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label">Teacher</label>
                    <select
                      name="teacher_id"
                      className={`form-select ${batchFormErrors.teacher_id ? "is-invalid" : ""}`}
                      value={batchForm.teacher_id}
                      onChange={handleBatchFormChange}
                      disabled={!effectiveBatchSubjectId}
                    >
                      <option value="">
                        {effectiveBatchSubjectId
                          ? "-- Select Teacher --"
                          : "Select a Subject first"}
                      </option>
                      {batchTeacherOptions.map((t) => (
                        <option key={t.id} value={t.id}>{t.teacher_name}</option>
                      ))}
                    </select>
                    {batchFormErrors.teacher_id && (
                      <div className="invalid-feedback">{batchFormErrors.teacher_id}</div>
                    )}
                    {effectiveBatchSubjectId && batchTeacherOptions.length === 0 && (
                      <div className="form-text text-warning">
                        No teacher is assigned (via Teacher Management) to a course whose
                        syllabus includes this subject.
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label d-block">Students</label>
                    {!effectiveBatchSubjectId ? (
                      <div className="text-muted small">
                        Select a Subject — students admitted for a course whose
                        syllabus includes it will be suggested here.
                      </div>
                    ) : batchStudentOptions.length === 0 ? (
                      <div className="text-muted small">
                        No admitted students found for this subject.
                      </div>
                    ) : (
                      <div className="border rounded p-2 row g-2">
                        {batchStudentOptions.map((a) => (
                          <div className="col-md-4" key={a.id}>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={batchSelectedStudentIds.includes(a.id)}
                                onChange={() => toggleBatchStudentSelection(a.id)}
                              />
                              <label className="form-check-label">
                                {a.applicant_name}
                                {a.comn_enrol_no && (
                                  <span className="text-muted small"> ({a.comn_enrol_no})</span>
                                )}
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
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={batchSubmitting}>
                  {batchSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Batch Confirmation Modal */}
      <div className="modal fade" tabIndex="-1" ref={batchDeleteModalRef}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Remove Batch</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">Are you sure you want to remove this batch?</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteBatch}>
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeConcept === "concept1" && (
        <>
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
          <h4 className="mb-3">Today's Teacher Availability</h4>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="fw-bold text-success mb-2">
                <i className="bi bi-check-circle me-1"></i>
                Available Today ({teacherStatus.available.length})
              </div>
              {teacherStatus.available.length === 0 ? (
                <div className="text-muted small">No teachers found.</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {teacherStatus.available.map((t) => (
                    <span key={t.id} className="badge bg-success">
                      {t.teacher_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <div className="fw-bold text-danger mb-2">
                <i className="bi bi-x-circle me-1"></i>
                Not Available Today ({teacherStatus.nonAvailable.length})
              </div>
              {teacherStatus.nonAvailable.length === 0 ? (
                <div className="text-muted small">
                  Everyone is available today.
                </div>
              ) : (
                <div className="d-flex flex-column gap-1">
                  {teacherStatus.nonAvailable.map((t) => (
                    <div key={t.id} className="small">
                      <span className="badge bg-danger me-1">
                        {t.teacher_name}
                      </span>
                      <span className="text-muted">{t.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                            {daySlots.map((slot) => {
                              const activeSub = (slot.Substitutions || [])[0];
                              const teacherUnavailable =
                                isToday &&
                                nonAvailableTeacherIds.has(
                                  slot.Group?.teacher_id
                                );
                              return (
                                <div
                                  key={slot.id}
                                  className="small mt-1 border-top pt-1"
                                >
                                  <div className="fw-semibold">
                                    {slot.Group?.group_name}
                                    {slot.ClassSession?.ended_at ? (
                                      <span className="badge bg-secondary ms-2">
                                        <i className="bi bi-check-circle me-1"></i>
                                        Class Completed
                                      </span>
                                    ) : (
                                      slot.ClassSession?.started_at && (
                                        <span
                                          className="ms-2"
                                          title="Class in progress"
                                        >
                                          <span
                                            className="d-inline-block rounded-circle bg-success"
                                            style={{
                                              width: "8px",
                                              height: "8px",
                                            }}
                                          ></span>
                                          <span className="text-success small ms-1">
                                            Live
                                          </span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                  <div className="text-muted">
                                    {slot.Group?.Teacher?.teacher_name} —{" "}
                                    {slot.timing || "No timing"}
                                  </div>
                                  {activeSub && (
                                    <div className="alert alert-warning py-1 px-2 mt-1 mb-1 small">
                                      <i className="bi bi-exclamation-triangle me-1"></i>
                                      Substitute teacher set:{" "}
                                      <strong>
                                        {activeSub.SubstituteTeacher
                                          ?.teacher_name}
                                      </strong>{" "}
                                      (today only)
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-link text-danger p-0 ms-2"
                                        onClick={() =>
                                          removeSubstitute(slot.id)
                                        }
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                  {teacherUnavailable && !activeSub && (
                                    <div className="mt-1">
                                      <div className="text-danger small">
                                        <i className="bi bi-person-x me-1"></i>
                                        {slot.Group?.Teacher?.teacher_name} is
                                        not available today.
                                      </div>
                                      <div className="d-flex gap-1 mt-1">
                                        <select
                                          className="form-select form-select-sm"
                                          value={
                                            substituteForm[slot.id] || ""
                                          }
                                          onChange={(e) =>
                                            setSubstituteForm((prev) => ({
                                              ...prev,
                                              [slot.id]: e.target.value,
                                            }))
                                          }
                                        >
                                          <option value="">
                                            -- Pick substitute --
                                          </option>
                                          {teacherStatus.available
                                            .filter(
                                              (t) =>
                                                t.id !== slot.Group?.teacher_id
                                            )
                                            .map((t) => (
                                              <option key={t.id} value={t.id}>
                                                {t.teacher_name}
                                              </option>
                                            ))}
                                        </select>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-warning text-nowrap"
                                          onClick={() =>
                                            assignSubstitute(slot.id)
                                          }
                                        >
                                          Assign
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() => deleteSlot(slot.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              );
                            })}
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

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h4 className="mb-3">Holidays</h4>
          <div className="text-muted small mb-3">
            Mark a date as a holiday — no classes that day, attendance
            can't be marked, and it shows on the Teacher's and Student's
            attendance pages.
          </div>
          <div className="row g-2 align-items-end mb-3">
            <div className="col-md-3">
              <label className="form-label small mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={holidayForm.date}
                onChange={(e) =>
                  setHolidayForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="col-md-5">
              <label className="form-label small mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Diwali Holiday"
                value={holidayForm.description}
                onChange={(e) =>
                  setHolidayForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100"
                onClick={addHoliday}
              >
                Add Holiday
              </button>
            </div>
          </div>

          {holidays.length === 0 ? (
            <div className="text-muted small">No holidays marked yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td>{h.description || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteHoliday(h.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        </>
      )}
    </div>
  );
}

export default GroupManagement;
