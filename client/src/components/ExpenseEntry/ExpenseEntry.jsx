import { useEffect, useRef, useState } from "react";
import { Modal } from "bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../../api/api";

const initialForm = {
  expense_date: "",
  bill_no: "",
  category: "",
  paid_to: "",
  amount: "",
  payment_mode: "Cash",
  description: "",
};

const CATEGORY_OPTIONS = [
  "Stationery",
  "Rent",
  "Electricity",
  "Water",
  "Internet / Phone",
  "Equipment",
  "Maintenance",
  "Salary",
  "Marketing",
  "Other",
];

const EXPORT_COLUMNS = [
  { key: "expense_date", label: "Date" },
  { key: "bill_no", label: "Bill Number" },
  { key: "category", label: "Category" },
  { key: "paid_to", label: "Paid To" },
  { key: "amount", label: "Amount" },
  { key: "payment_mode", label: "Mode of Payment" },
  { key: "description", label: "Description" },
];

function ExpenseEntry() {
  const viewModalRef = useRef(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewEntry, setViewEntry] = useState(null);
  const [sortField, setSortField] = useState("expense_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const fetchExpenses = async () => {
    try {
      const response = await API.get("/expenses");
      setExpenses(response.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
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
    const modalEl = viewModalRef.current;
    if (!modalEl) return;
    modalEl.addEventListener("hidden.bs.modal", forceCleanup);
    return () => modalEl.removeEventListener("hidden.bs.modal", forceCleanup);
  }, [loading]);

  const openViewModal = (entry) => {
    setViewEntry(entry);
    Modal.getOrCreateInstance(viewModalRef.current).show();
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      expense_date: entry.expense_date || "",
      bill_no: entry.bill_no || "",
      category: entry.category || "",
      paid_to: entry.paid_to || "",
      amount: entry.amount || "",
      payment_mode: entry.payment_mode || "Cash",
      description: entry.description || "",
    });
    setFormErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialForm);
    setFormErrors({});
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
    if (!formData.amount) errors.amount = "Amount is required.";
    else if (Number(formData.amount) <= 0)
      errors.amount = "Amount must be greater than 0.";
    if (!formData.expense_date) errors.expense_date = "Date is required.";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setSubmitting(true);
    try {
      const response = editingId
        ? await API.put(`/expenses/${editingId}`, formData)
        : await API.post("/expenses", formData);
      setFormData(initialForm);
      setEditingId(null);
      await fetchExpenses();
      setToast({
        variant: "success",
        message: response.data.message || "Expense entry saved successfully",
      });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setFormErrors(serverErrors);
      } else {
        setToast({
          variant: "danger",
          message: err.response?.data?.message || "Failed to save expense entry.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense entry?")) {
      return;
    }
    try {
      const response = await API.delete(`/expenses/${id}`);
      await fetchExpenses();
      setToast({
        variant: "success",
        message: response.data.message || "Expense entry deleted successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete expense entry.",
      });
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      (e.bill_no || "").toLowerCase().includes(term) ||
      (e.category || "").toLowerCase().includes(term) ||
      (e.paid_to || "").toLowerCase().includes(term) ||
      (e.payment_mode || "").toLowerCase().includes(term) ||
      (e.description || "").toLowerCase().includes(term)
    );
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    let result;
    if (sortField === "amount") {
      result = (Number(valA) || 0) - (Number(valB) || 0);
    } else if (sortField === "expense_date") {
      result = new Date(valA || 0) - new Date(valB || 0);
    } else {
      result = valA.toString().localeCompare(valB.toString());
    }
    return sortOrder === "asc" ? result : -result;
  });

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / ROWS_PER_PAGE));
  const paginatedExpenses = sortedExpenses.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

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

  const exportToExcel = () => {
    const data = sortedExpenses.map((row) => {
      const record = {};
      EXPORT_COLUMNS.forEach((col) => {
        record[col.label] = row[col.key] ?? "";
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expense_entries.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const head = [EXPORT_COLUMNS.map((col) => col.label)];
    const body = sortedExpenses.map((row) =>
      EXPORT_COLUMNS.map((col) => (row[col.key] ?? "-").toString())
    );
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
    });
    doc.save("expense_entries.pdf");
  };

  if (loading) return <p className="text-center text-muted p-4">Loading...</p>;
  if (error) return <p className="text-center text-danger p-4">{error}</p>;

  return (
    <div className="card shadow-sm mt-4">
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

      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h4 className="mb-0">
            Expense Entry
            <span className="badge bg-danger ms-2">
              Total: Rs. {totalExpenses.toLocaleString("en-IN")}
            </span>
          </h4>
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

        <form onSubmit={handleSubmit} className="row g-3 align-items-end">
          {editingId && (
            <div className="col-12">
              <div className="alert alert-warning py-2 px-3 mb-0 small">
                Editing existing expense entry. Click Cancel to add a new
                entry instead.
              </div>
            </div>
          )}
          <div className="col-md-2">
            <label className="form-label">Date</label>
            <input
              type="date"
              name="expense_date"
              className={`form-control ${formErrors.expense_date ? "is-invalid" : ""}`}
              value={formData.expense_date}
              onChange={handleChange}
            />
            {formErrors.expense_date && (
              <div className="invalid-feedback">{formErrors.expense_date}</div>
            )}
          </div>
          <div className="col-md-2">
            <label className="form-label">Bill Number</label>
            <input
              type="text"
              name="bill_no"
              className="form-control"
              value={formData.bill_no}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Category</label>
            <select
              name="category"
              className="form-select"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">-- Select --</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Paid To (Vendor/Company)</label>
            <input
              type="text"
              name="paid_to"
              className="form-control"
              value={formData.paid_to}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Amount</label>
            <input
              type="number"
              name="amount"
              className={`form-control ${formErrors.amount ? "is-invalid" : ""}`}
              value={formData.amount}
              onChange={handleChange}
            />
            {formErrors.amount && (
              <div className="invalid-feedback">{formErrors.amount}</div>
            )}
          </div>
          <div className="col-md-2">
            <label className="form-label">Mode of Payment</label>
            <select
              name="payment_mode"
              className="form-select"
              value={formData.payment_mode}
              onChange={handleChange}
            >
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
              <option value="GPay">GPay</option>
            </select>
          </div>
          <div className="col-md-8">
            <label className="form-label">Description</label>
            <input
              type="text"
              name="description"
              className="form-control"
              placeholder="What was this expense for?"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-2 d-flex gap-2">
            <button
              type="submit"
              className="btn btn-danger flex-fill"
              disabled={submitting}
            >
              {submitting ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="input-group input-group-sm my-3" style={{ maxWidth: "320px" }}>
          <span className="input-group-text bg-white">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search bill, category, vendor, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th role="button" onClick={() => handleSort("expense_date")}>
                  Date <i className={`bi ${sortIcon("expense_date")}`}></i>
                </th>
                <th role="button" onClick={() => handleSort("bill_no")}>
                  Bill Number <i className={`bi ${sortIcon("bill_no")}`}></i>
                </th>
                <th role="button" onClick={() => handleSort("category")}>
                  Category <i className={`bi ${sortIcon("category")}`}></i>
                </th>
                <th role="button" onClick={() => handleSort("paid_to")}>
                  Paid To <i className={`bi ${sortIcon("paid_to")}`}></i>
                </th>
                <th role="button" onClick={() => handleSort("amount")}>
                  Amount <i className={`bi ${sortIcon("amount")}`}></i>
                </th>
                <th role="button" onClick={() => handleSort("payment_mode")}>
                  Mode <i className={`bi ${sortIcon("payment_mode")}`}></i>
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td className="text-center text-muted" colSpan={8}>
                    No expense entries found.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</td>
                    <td>{entry.expense_date ?? "-"}</td>
                    <td>{entry.bill_no ?? "-"}</td>
                    <td>
                      {entry.category ? (
                        <span className="badge bg-secondary">
                          {entry.category}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{entry.paid_to ?? "-"}</td>
                    <td>Rs. {Number(entry.amount).toLocaleString("en-IN")}</td>
                    <td>{entry.payment_mode ?? "-"}</td>
                    <td className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openViewModal(entry)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => startEdit(entry)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteExpense(entry.id)}
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

        <div className="d-flex flex-wrap justify-content-between align-items-center mt-2 gap-2">
          <span className="text-muted small">
            Showing{" "}
            {sortedExpenses.length === 0
              ? 0
              : (currentPage - 1) * ROWS_PER_PAGE + 1}
            –{Math.min(currentPage * ROWS_PER_PAGE, sortedExpenses.length)} of{" "}
            {sortedExpenses.length} records
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
      </div>

      {/* View Expense Modal */}
      <div
        className="modal fade"
        id="expenseViewModal"
        tabIndex="-1"
        ref={viewModalRef}
      >
        <div className="modal-dialog modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Expense Entry Details</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              {viewEntry && (
                <div className="row g-3">
                  {EXPORT_COLUMNS.map((col) => (
                    <div className="col-md-6" key={col.key}>
                      <div className="text-muted small fw-bold text-uppercase">
                        {col.label}
                      </div>
                      <div>{viewEntry[col.key] || "-"}</div>
                    </div>
                  ))}
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
    </div>
  );
}

export default ExpenseEntry;
