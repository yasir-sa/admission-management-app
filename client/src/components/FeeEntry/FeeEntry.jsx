import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../../api/api";

const initialForm = {
  paid_date: "",
  bill_no: "",
  enrol_no: "",
  amount: "",
  payment_mode: "Cash",
};

const EXPORT_COLUMNS = [
  { key: "paid_date", label: "Bill Date" },
  { key: "bill_no", label: "Bill Number" },
  { key: "enrol_no", label: "Enrollment Number" },
  { key: "amount", label: "Amount" },
  { key: "payment_mode", label: "Mode of Payment" },
];

function computeFeeInfo(admission, entries) {
  const totalFee =
    admission.total_fee !== null ? Number(admission.total_fee) : null;
  const totalPaid = entries
    .filter((e) => e.enrol_no === admission.comn_enrol_no)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const balance = totalFee !== null ? totalFee - totalPaid : null;
  const status =
    totalFee !== null ? (balance <= 0 ? "Paid" : "Pending") : totalPaid > 0 ? "Paid" : "Pending";
  return { totalFee, totalPaid, balance, status };
}

function FeeEntry() {
  const [admissions, setAdmissions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const fetchData = async () => {
    try {
      const [admissionsRes, entriesRes] = await Promise.all([
        API.get("/admissions?active=true"),
        API.get("/fee-entries"),
      ]);
      setAdmissions(admissionsRes.data.data);
      setEntries(entriesRes.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load fee data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredAdmissions = admissions.filter(
    (a) => computeFeeInfo(a, entries).status === statusFilter
  );

  const matchedPerson = formData.enrol_no.trim()
    ? admissions.find((a) => a.comn_enrol_no === formData.enrol_no.trim())
    : null;
  const matchedFeeInfo = matchedPerson
    ? computeFeeInfo(matchedPerson, entries)
    : null;

  const totalPages = Math.max(1, Math.ceil(entries.length / ROWS_PER_PAGE));
  const paginatedEntries = entries.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      paid_date: entry.paid_date || "",
      bill_no: entry.bill_no || "",
      enrol_no: entry.enrol_no || "",
      amount: entry.amount || "",
      payment_mode: entry.payment_mode || "Cash",
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
    else if (matchedFeeInfo?.balance !== null && matchedFeeInfo?.balance !== undefined) {
      const editingOriginalAmount = editingId
        ? Number(entries.find((e) => e.id === editingId)?.amount || 0)
        : 0;
      const editableBalance = matchedFeeInfo.balance + editingOriginalAmount;
      if (Number(formData.amount) > editableBalance) {
        errors.amount = `Amount exceeds remaining balance of Rs. ${editableBalance}.`;
      }
    }
    if (!formData.paid_date) errors.paid_date = "Bill date is required.";
    if (!formData.enrol_no.trim())
      errors.enrol_no = "Enrollment Number is required.";
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
        ? await API.put(`/fee-entries/${editingId}`, formData)
        : await API.post("/fee-entries", formData);
      setFormData(initialForm);
      setEditingId(null);
      await fetchData();
      setToast({
        variant: "success",
        message: response.data.message || "Fee entry saved successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to save fee entry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this fee entry?")) {
      return;
    }
    try {
      const response = await API.delete(`/fee-entries/${id}`);
      await fetchData();
      setToast({
        variant: "success",
        message: response.data.message || "Fee entry deleted successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to delete fee entry.",
      });
    }
  };

  const exportToExcel = () => {
    const data = entries.map((row) => {
      const record = {};
      EXPORT_COLUMNS.forEach((col) => {
        record[col.label] = row[col.key] ?? "";
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Entries");
    XLSX.writeFile(workbook, "fee_entries.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const head = [EXPORT_COLUMNS.map((col) => col.label)];
    const body = entries.map((row) =>
      EXPORT_COLUMNS.map((col) => (row[col.key] ?? "-").toString())
    );
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [29, 78, 216] },
    });
    doc.save("fee_entries.pdf");
  };

  if (loading) return <p className="text-center text-muted p-4">Loading...</p>;
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

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Fee Entry</h4>
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
                  Editing existing fee entry. Click Cancel to add a new entry
                  instead.
                </div>
              </div>
            )}
            <div className="col-md-2">
              <label className="form-label">Bill Date</label>
              <input
                type="date"
                name="paid_date"
                className={`form-control ${formErrors.paid_date ? "is-invalid" : ""}`}
                value={formData.paid_date}
                onChange={handleChange}
              />
              {formErrors.paid_date && (
                <div className="invalid-feedback">{formErrors.paid_date}</div>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label">Bill Number</label>
              <input
                type="text"
                name="bill_no"
                className="form-control"
                value={formData.bill_no}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Enrollment Number</label>
              <input
                type="text"
                name="enrol_no"
                className={`form-control ${formErrors.enrol_no ? "is-invalid" : ""}`}
                value={formData.enrol_no}
                onChange={handleChange}
              />
              {formErrors.enrol_no && (
                <div className="invalid-feedback">{formErrors.enrol_no}</div>
              )}
            </div>

            {matchedPerson && (
              <div className="col-12">
                <div className="border rounded p-2 px-3 bg-light d-flex flex-wrap gap-4 align-items-center">
                  <div>
                    <span className="text-muted small d-block">Name</span>
                    <strong>{matchedPerson.applicant_name}</strong>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Total Fee</span>
                    <strong>
                      {matchedFeeInfo.totalFee !== null
                        ? `Rs. ${matchedFeeInfo.totalFee}`
                        : "Not set"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Paid</span>
                    <strong className="text-success">
                      Rs. {matchedFeeInfo.totalPaid}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Balance</span>
                    <strong className="text-danger">
                      {matchedFeeInfo.balance !== null
                        ? `Rs. ${Math.max(matchedFeeInfo.balance, 0)}`
                        : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Status</span>
                    <span
                      className={`badge ${matchedFeeInfo.status === "Paid" ? "bg-success" : "bg-warning"}`}
                    >
                      {matchedFeeInfo.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

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

            <div className="col-md-2 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary flex-fill"
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

          <h6 className="mt-4 mb-2">Fee Entries</h6>
          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Bill Date</th>
                  <th>Bill Number</th>
                  <th>Enrollment Number</th>
                  <th>Amount</th>
                  <th>Mode of Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted" colSpan={7}>
                      No fee entries found.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry, index) => (
                    <tr key={entry.id}>
                      <td>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</td>
                      <td>{entry.paid_date ?? "-"}</td>
                      <td>{entry.bill_no ?? "-"}</td>
                      <td>{entry.enrol_no ?? "-"}</td>
                      <td>{entry.amount ?? "-"}</td>
                      <td>{entry.payment_mode ?? "-"}</td>
                      <td className="d-flex gap-2">
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
                          onClick={() => deleteEntry(entry.id)}
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
              {entries.length === 0
                ? 0
                : (currentPage - 1) * ROWS_PER_PAGE + 1}
              –{Math.min(currentPage * ROWS_PER_PAGE, entries.length)} of{" "}
              {entries.length} records
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

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5 className="mb-0">All Students — Fee Status</h5>
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "Paid" ? "btn-success" : "btn-outline-success"}`}
                onClick={() => setStatusFilter("Paid")}
              >
                Paid
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "Pending" ? "btn-warning" : "btn-outline-warning"}`}
                onClick={() => setStatusFilter("Pending")}
              >
                Pending
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Enrolment No</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted" colSpan={7}>
                      No {statusFilter.toLowerCase()} records found.
                    </td>
                  </tr>
                ) : (
                  filteredAdmissions.map((a, index) => {
                    const info = computeFeeInfo(a, entries);
                    return (
                      <tr key={a.id}>
                        <td>{index + 1}</td>
                        <td>{a.applicant_name}</td>
                        <td>{a.comn_enrol_no || "-"}</td>
                        <td>
                          {info.totalFee !== null
                            ? `Rs. ${info.totalFee}`
                            : "-"}
                        </td>
                        <td>Rs. {info.totalPaid}</td>
                        <td>
                          {info.balance !== null
                            ? `Rs. ${Math.max(info.balance, 0)}`
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge ${info.status === "Paid" ? "bg-success" : "bg-warning"}`}
                          >
                            {info.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeeEntry;
