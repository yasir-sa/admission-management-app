import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Modal } from "bootstrap";
import { FiUserX } from "react-icons/fi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../../api/api";
import AdmissionModal from "../AdmissionModal/AdmissionModal";
import AdmissionCharts from "../AdmissionCharts/AdmissionCharts";
import "./List.css";

const EXPORT_COLUMNS = [
  { key: "comn_enrol_no", label: "Enrol No" },
  { key: "course_name", label: "Course" },
  { key: "session", label: "Session" },
  { key: "applicant_name", label: "Name" },
  { key: "father_husband_name", label: "Father/Husband" },
  { key: "guardian_occupation", label: "Guardian Occupation" },
  { key: "date_of_birth", label: "DOB" },
  { key: "age", label: "Age" },
  { key: "sex", label: "Sex" },
  { key: "educational_qualification", label: "Qualification" },
  { key: "religion", label: "Religion" },
  { key: "community", label: "Community" },
  { key: "occupation", label: "Occupation" },
  { key: "aadhar_no", label: "Aadhar No" },
  { key: "company_name", label: "Company" },
  { key: "address", label: "Address" },
  { key: "mobile_no", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "total_fee", label: "Total Fee" },
  { key: "first_installment_amount", label: "1st Installment" },
  { key: "bill_no", label: "Bill No" },
  { key: "scheme", label: "Scheme" },
  { key: "timings", label: "Timings" },
  { key: "created_at", label: "Submitted On" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const QUICK_RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

function List() {
  const [admissions, setAdmissions] = useState([]);
  const [feeEntries, setFeeEntries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);
  const ROWS_PER_PAGE = 10;
  const navigate = useNavigate();

  const todayStr = toDateStr(new Date());
  const earliestDateStr =
    admissions.reduce((min, a) => {
      if (!a.created_at) return min;
      const d = a.created_at.slice(0, 10);
      return !min || d < min ? d : min;
    }, null) || todayStr;

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState("all");
  const hasInitializedRange = useRef(false);

  useEffect(() => {
    if (hasInitializedRange.current || admissions.length === 0) return;
    hasInitializedRange.current = true;
    setStartDate(earliestDateStr);
    setEndDate(todayStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissions.length]);

  const selectQuickRange = (key) => {
    setActivePreset(key);
    const now = new Date();
    const nowStr = toDateStr(now);

    if (key === "today") {
      setStartDate(nowStr);
      setEndDate(nowStr);
    } else if (key === "week") {
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - daysSinceMonday);
      setStartDate(toDateStr(monday));
      setEndDate(nowStr);
    } else if (key === "month") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toDateStr(firstOfMonth));
      setEndDate(nowStr);
    } else if (key === "all") {
      setStartDate(earliestDateStr);
      setEndDate(nowStr);
    }
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setActivePreset(null);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setActivePreset(null);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const copyAttendanceLink = async (row) => {
    const link = `${window.location.origin}/attendance/register/${row.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setToast({
        variant: "success",
        message: `Attendance link copied for ${row.applicant_name}`,
      });
    } catch {
      setToast({ variant: "danger", message: link });
    }
  };

  const SORTABLE_COLUMNS = [
    { key: "comn_enrol_no", label: "Enrol No" },
    { key: "applicant_name", label: "Name" },
    { key: "course_name", label: "Course" },
    { key: "mobile_no", label: "Mobile" },
    { key: "created_at", label: "Submitted On" },
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return "bi-arrow-down-up text-white-50";
    return sortOrder === "asc" ? "bi-sort-up" : "bi-sort-down";
  };

  const fetchAdmissions = async () => {
    try {
      const [admissionsRes, feeEntriesRes, coursesRes] = await Promise.all([
        API.get("/admissions?active=true"),
        API.get("/fee-entries"),
        API.get("/courses?active=true"),
      ]);
      setAdmissions(admissionsRes.data.data);
      setFeeEntries(feeEntriesRes.data.data);
      setCourses(coursesRes.data.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load admission records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortOrder]);

  const deleteAdmission = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this record? It will be moved to Inactive."
      )
    ) {
      return;
    }
    try {
      await API.delete(`/admissions/${id}`);
      setAdmissions((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to delete admission record."
      );
    }
  };

  const dateFilteredAdmissions = admissions.filter((a) => {
    if (!a.created_at) return false;
    const d = toDateStr(new Date(a.created_at));
    return d >= startDate && d <= endDate;
  });

  const dateFilteredFeeEntries = feeEntries.filter(
    (e) => e.paid_date && e.paid_date >= startDate && e.paid_date <= endDate
  );

  const reportStats = (() => {
    const allAdmissionEnrolNos = new Set(
      admissions.map((a) => a.comn_enrol_no).filter(Boolean)
    );

    const totalPerson = dateFilteredAdmissions.length;

    const bv = dateFilteredAdmissions.reduce((sum, a) => {
      if (
        a.total_fee !== null &&
        a.total_fee !== undefined &&
        a.total_fee !== ""
      ) {
        return sum + Number(a.total_fee);
      }
      const matchedCourse = courses.find(
        (c) =>
          (c.course_name || "").trim().toLowerCase() ===
          (a.course_name || "").trim().toLowerCase()
      );
      if (
        matchedCourse &&
        matchedCourse.standard_fee !== null &&
        matchedCourse.standard_fee !== undefined &&
        matchedCourse.standard_fee !== ""
      ) {
        return sum + Number(matchedCourse.standard_fee);
      }
      return sum;
    }, 0);

    const cr = dateFilteredFeeEntries
      .filter((e) => allAdmissionEnrolNos.has(e.enrol_no))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const collection = dateFilteredFeeEntries.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    const gpayTotal = dateFilteredFeeEntries
      .filter((e) => (e.payment_mode || "").toLowerCase() === "gpay")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const cashTotal = dateFilteredFeeEntries
      .filter((e) => (e.payment_mode || "").toLowerCase() === "cash")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return { totalPerson, bv, cr, collection, gpayTotal, cashTotal };
  })();

  const filteredAdmissions = admissions.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    const matchesOwnFields = Object.entries(row).some(
      ([key, value]) =>
        key !== "FeePayments" &&
        value !== null &&
        value !== undefined &&
        value.toString().toLowerCase().includes(term)
    );
    if (matchesOwnFields) return true;

    const matchesFeePayments = (row.FeePayments || []).some((payment) =>
      ["enrol_no", "bill_no"].some((key) => {
        const value = payment[key];
        return (
          value !== null &&
          value !== undefined &&
          value.toString().toLowerCase().includes(term)
        );
      })
    );
    return matchesFeePayments;
  });

  const sortedAdmissions = [...filteredAdmissions].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    let result;
    if (sortField === "created_at") {
      result = new Date(valA) - new Date(valB);
    } else {
      result = valA.toString().localeCompare(valB.toString());
    }
    return sortOrder === "asc" ? result : -result;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedAdmissions.length / ROWS_PER_PAGE)
  );
  const paginatedAdmissions = sortedAdmissions.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const exportToExcel = () => {
    const data = sortedAdmissions.map((row) => {
      const record = {};
      EXPORT_COLUMNS.forEach((col) => {
        record[col.label] =
          col.key === "created_at"
            ? formatDateTime(row[col.key])
            : row[col.key] ?? "";
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions");
    XLSX.writeFile(workbook, "admission_records.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const head = [EXPORT_COLUMNS.map((col) => col.label)];
    const body = sortedAdmissions.map((row) =>
      EXPORT_COLUMNS.map((col) =>
        col.key === "created_at"
          ? formatDateTime(row[col.key])
          : (row[col.key] ?? "-").toString()
      )
    );
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [29, 78, 216] },
    });
    doc.save("admission_records.pdf");
  };

  if (loading) return <p className="list-status">Loading...</p>;
  if (error) return <p className="list-status list-error">{error}</p>;

  return (
    <div className="admission-list">
      {toast && (
        <div
          className="toast-container position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1080 }}
        >
          <div className={`toast show text-white bg-${toast.variant}`}>
            <div className="d-flex">
              <div className="toast-body" style={{ wordBreak: "break-all" }}>
                {toast.message}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setToast(null)}
              ></button>
            </div>
          </div>
        </div>
      )}
      <div className="list-header">
        <h2 className="d-flex align-items-center gap-2 mb-0">
          Admission Records
          <span className="badge bg-primary">
            Total: {admissions.length}
          </span>
        </h2>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-1"
            onClick={() => {
              setEditingRecord(null);
              Modal.getOrCreateInstance(
                document.getElementById("addAdmissionModal")
              ).show();
            }}
          >
            <i className="bi bi-plus-lg"></i> Add Admission
          </button>
          <Link to="/inactive" className="btn-inactive-link">
            <FiUserX /> Inactive Records
          </Link>
        </div>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="input-group" style={{ maxWidth: "320px" }}>
          <span className="input-group-text bg-white">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search all fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
            onClick={exportToExcel}
          >
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
            onClick={exportToPDF}
          >
            <i className="bi bi-file-earmark-pdf"></i> Export PDF
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="list-table">
          <thead>
            <tr>
              <th>#</th>
              {SORTABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  role="button"
                  onClick={() => handleSort(col.key)}
                  className="user-select-none"
                >
                  {col.label} <i className={`bi ${sortIcon(col.key)}`}></i>
                </th>
              ))}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAdmissions.length === 0 ? (
              <tr>
                <td className="list-status" colSpan={7}>
                  No admission records found.
                </td>
              </tr>
            ) : (
              paginatedAdmissions.map((row, index) => (
                <tr key={row.id}>
                  <td>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</td>
                  <td>{row.comn_enrol_no || "-"}</td>
                  <td className="name-cell">{row.applicant_name}</td>
                  <td>{row.course_name}</td>
                  <td>{row.mobile_no}</td>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-warning"
                      title="Edit Admission"
                      onClick={() => {
                        setEditingRecord(row);
                        Modal.getOrCreateInstance(
                          document.getElementById("addAdmissionModal")
                        ).show();
                      }}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      title="View Details"
                      onClick={() => navigate(`/admissions/${row.id}/details`)}
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-success"
                      title="Fee Payments"
                      onClick={() => navigate(`/admissions/${row.id}`)}
                    >
                      <i className="bi bi-cash-coin"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      title="Copy Attendance Link"
                      onClick={() => copyAttendanceLink(row)}
                    >
                      <i className="bi bi-qr-code"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      title="Delete"
                      onClick={() => deleteAdmission(row.id)}
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
          {sortedAdmissions.length === 0
            ? 0
            : (currentPage - 1) * ROWS_PER_PAGE + 1}
          –
          {Math.min(currentPage * ROWS_PER_PAGE, sortedAdmissions.length)} of{" "}
          {sortedAdmissions.length} records
        </span>

        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
            ))}
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

      <div className="card shadow-sm mb-3 mt-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <div className="d-flex gap-2 flex-wrap">
              {QUICK_RANGES.map((range) => (
                <button
                  key={range.key}
                  type="button"
                  className={`btn btn-sm ${activePreset === range.key ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => selectQuickRange(range.key)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="d-flex align-items-end gap-2">
              <div>
                <label className="form-label small mb-1">Start Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={startDate}
                  max={endDate}
                  onChange={handleStartDateChange}
                />
              </div>
              <div>
                <label className="form-label small mb-1">End Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={endDate}
                  min={startDate}
                  max={todayStr}
                  onChange={handleEndDateChange}
                />
              </div>
            </div>
          </div>
          <div className="row g-3 text-center">
            <div className="col-6 col-md-2">
              <div className="text-muted small text-uppercase fw-bold">
                Total Person
              </div>
              <div className="fs-4 fw-bold text-dark">
                {reportStats.totalPerson}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div
                className="text-muted small text-uppercase fw-bold"
                title="Total fee billed for Admission-list persons only (uses Course fee when not set on Admission)"
              >
                BV
              </div>
              <div className="fs-4 fw-bold text-primary">
                Rs. {reportStats.bv.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div
                className="text-muted small text-uppercase fw-bold"
                title="Total collected from Admission-list persons only"
              >
                CR
              </div>
              <div className="fs-4 fw-bold text-success">
                Rs. {reportStats.cr.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div
                className="text-muted small text-uppercase fw-bold"
                title="Total collected from Admission + Non-Admission persons combined"
              >
                Collection
              </div>
              <div className="fs-4 fw-bold text-success">
                Rs. {reportStats.collection.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div
                className="text-muted small text-uppercase fw-bold"
                title="Total paid via GPay — Admission + Non-Admission combined"
              >
                GPay Total
              </div>
              <div className="fs-4 fw-bold text-info">
                Rs. {reportStats.gpayTotal.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div
                className="text-muted small text-uppercase fw-bold"
                title="Total paid via Cash — Admission + Non-Admission combined"
              >
                Cash Total
              </div>
              <div className="fs-4 fw-bold text-warning">
                Rs. {reportStats.cashTotal.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdmissionCharts
        admissions={admissions}
        startDate={startDate}
        endDate={endDate}
      />

      <AdmissionModal editingRecord={editingRecord} onSuccess={fetchAdmissions} />
    </div>
  );
}

export default List;
