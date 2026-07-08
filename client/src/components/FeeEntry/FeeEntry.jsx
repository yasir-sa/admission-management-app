import { useEffect, useState } from "react";
import API from "../../api/api";

const initialForm = {
  enrol_no: "",
  bill_no: "",
  amount_paid: "",
  paid_date: "",
  towards: "",
  payment_mode: "Cash",
  cheque_card_no: "",
  bank_name: "",
};

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function threeDigitsToWords(n) {
  if (n >= 100) {
    return (
      ONES[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + twoDigitsToWords(n % 100) : "")
    );
  }
  return twoDigitsToWords(n);
}

function numberToWords(value) {
  let num = Math.floor(Number(value) || 0);
  if (!num) return "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  let result = "";
  if (crore) result += threeDigitsToWords(crore) + " Crore ";
  if (lakh) result += threeDigitsToWords(lakh) + " Lakh ";
  if (thousand) result += threeDigitsToWords(thousand) + " Thousand ";
  if (hundred) result += threeDigitsToWords(hundred);

  return result.trim() + " Rupees Only";
}

function computeFeeInfo(admission) {
  const totalFee =
    admission.total_fee !== null ? Number(admission.total_fee) : null;
  const totalPaid = (admission.FeePayments || []).reduce(
    (sum, p) => sum + (Number(p.amount_paid) || 0),
    0
  );
  const balance = totalFee !== null ? totalFee - totalPaid : null;
  const status =
    totalFee === null ? null : balance <= 0 ? "Paid" : "Pending";
  return { totalFee, totalPaid, balance, status };
}

function FeeEntry() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Pending");

  const fetchAdmissions = async () => {
    try {
      const response = await API.get("/admissions?active=true");
      setAdmissions(response.data.data);
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
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedPerson = admissions.find((a) => a.id === selectedId) || null;
  const feeInfo = selectedPerson ? computeFeeInfo(selectedPerson) : null;

  const searchResults = searchTerm.trim()
    ? admissions.filter((a) => {
        const term = searchTerm.toLowerCase();
        return (
          (a.applicant_name || "").toLowerCase().includes(term) ||
          (a.mobile_no || "").toLowerCase().includes(term) ||
          (a.aadhar_no || "").toLowerCase().includes(term)
        );
      })
    : [];

  const selectPerson = (id) => {
    setSelectedId(id);
    setSearchTerm("");
    setFormData(initialForm);
    setFormErrors({});
    setEditingPaymentId(null);
  };

  const goBack = () => {
    setSelectedId(null);
    setSearchTerm("");
    setFormData(initialForm);
    setFormErrors({});
    setEditingPaymentId(null);
  };

  const filteredAdmissions = admissions.filter(
    (a) => computeFeeInfo(a).status === statusFilter
  );

  const startEditPayment = (payment) => {
    setEditingPaymentId(payment.id);
    setFormData({
      enrol_no: payment.enrol_no || "",
      bill_no: payment.bill_no || "",
      amount_paid: payment.amount_paid || "",
      paid_date: payment.paid_date || "",
      towards: payment.towards || "",
      payment_mode: payment.payment_mode || "Cash",
      cheque_card_no: payment.cheque_card_no || "",
      bank_name: payment.bank_name || "",
    });
    setFormErrors({});
  };

  const cancelEditPayment = () => {
    setEditingPaymentId(null);
    setFormData(initialForm);
    setFormErrors({});
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) {
      return;
    }
    try {
      const response = await API.delete(`/fee-payments/${paymentId}`);
      await fetchAdmissions();
      setToast({
        variant: "success",
        message: response.data.message || "Fee payment deleted successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message:
          err.response?.data?.message || "Failed to delete fee payment.",
      });
    }
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

  const editingOriginalAmount = editingPaymentId
    ? Number(
        (selectedPerson?.FeePayments || []).find(
          (p) => p.id === editingPaymentId
        )?.amount_paid || 0
      )
    : 0;
  const editableBalance =
    feeInfo?.balance !== null && feeInfo?.balance !== undefined
      ? feeInfo.balance + editingOriginalAmount
      : null;

  const validate = () => {
    const errors = {};
    if (!formData.amount_paid) errors.amount_paid = "Amount is required.";
    else if (Number(formData.amount_paid) <= 0)
      errors.amount_paid = "Amount must be greater than 0.";
    else if (
      editableBalance !== null &&
      Number(formData.amount_paid) > editableBalance
    ) {
      errors.amount_paid = `Amount exceeds remaining balance of Rs. ${editableBalance}.`;
    }
    if (!formData.paid_date) errors.paid_date = "Paid date is required.";
    if (["Cheque", "Card"].includes(formData.payment_mode)) {
      if (!formData.cheque_card_no.trim())
        errors.cheque_card_no = `${formData.payment_mode} No is required.`;
      if (!formData.bank_name.trim())
        errors.bank_name = "Bank Name is required.";
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
    setFormErrors({});

    const payload = {
      ...formData,
      amount_in_words: numberToWords(formData.amount_paid),
      status: "Paid",
    };

    setSubmitting(true);
    try {
      const response = editingPaymentId
        ? await API.put(`/fee-payments/${editingPaymentId}`, payload)
        : await API.post("/fee-payments", {
            admission_id: selectedPerson.id,
            ...payload,
          });
      setFormData(initialForm);
      setEditingPaymentId(null);
      await fetchAdmissions();
      setToast({
        variant: "success",
        message: response.data.message || "Fee payment added successfully",
      });
    } catch (err) {
      const field = err.response?.data?.field;
      const message =
        err.response?.data?.message || "Failed to add fee payment.";
      if (field) {
        setFormErrors((prev) => ({ ...prev, [field]: message }));
      } else {
        setToast({ variant: "danger", message });
      }
    } finally {
      setSubmitting(false);
    }
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
          <h4 className="mb-3">Fee Entry</h4>

          <label className="form-label">Search Student</label>
          <div className="position-relative mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by Name, Mobile No, or Aadhar No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div
                className="list-group position-absolute w-100 shadow-sm"
                style={{ zIndex: 10, maxHeight: "250px", overflowY: "auto" }}
              >
                {searchResults.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => selectPerson(a.id)}
                  >
                    <strong>{a.applicant_name}</strong> — {a.mobile_no}{" "}
                    <span className="text-muted small">
                      ({a.course_name})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPerson && feeInfo && (
            <>
              <button
                type="button"
                className="btn btn-link ps-0 mb-2 text-decoration-none"
                onClick={goBack}
              >
                <i className="bi bi-arrow-left"></i> Back to Search
              </button>
              <h5 className="mb-3">{selectedPerson.applicant_name}</h5>
              <div className="row g-2 mb-3">
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 text-center h-100">
                    <div className="text-muted small">Total Fee</div>
                    <div className="fw-bold">
                      {feeInfo.totalFee !== null
                        ? `Rs. ${feeInfo.totalFee}`
                        : "Not set"}
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 text-center h-100">
                    <div className="text-muted small">Total Paid</div>
                    <div className="fw-bold text-success">
                      Rs. {feeInfo.totalPaid}
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 text-center h-100">
                    <div className="text-muted small">Balance</div>
                    <div className="fw-bold text-danger">
                      {feeInfo.balance !== null
                        ? `Rs. ${Math.max(feeInfo.balance, 0)}`
                        : "-"}
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 text-center h-100">
                    <div className="text-muted small">Status</div>
                    <div>
                      {feeInfo.status && (
                        <span
                          className={`badge ${
                            feeInfo.status === "Paid"
                              ? "bg-success"
                              : "bg-warning"
                          }`}
                        >
                          {feeInfo.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(feeInfo.status !== "Paid" || editingPaymentId) && (
                <form onSubmit={handleSubmit} className="row g-3 align-items-end">
                  {editingPaymentId && (
                    <div className="col-12">
                      <div className="alert alert-warning py-2 px-3 mb-0 small">
                        Editing existing payment. Click Cancel to add a new
                        payment instead.
                      </div>
                    </div>
                  )}
                  <div className="col-md-3">
                    <label className="form-label">Enrolment No</label>
                    <input
                      type="text"
                      name="enrol_no"
                      className="form-control"
                      value={formData.enrol_no}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Bill No</label>
                    <input
                      type="text"
                      name="bill_no"
                      className="form-control"
                      value={formData.bill_no}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Amount Paid</label>
                    <input
                      type="number"
                      name="amount_paid"
                      className={`form-control ${formErrors.amount_paid ? "is-invalid" : ""}`}
                      value={formData.amount_paid}
                      onChange={handleChange}
                    />
                    {formErrors.amount_paid && (
                      <div className="invalid-feedback">
                        {formErrors.amount_paid}
                      </div>
                    )}
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Paid Date</label>
                    <input
                      type="date"
                      name="paid_date"
                      className={`form-control ${formErrors.paid_date ? "is-invalid" : ""}`}
                      value={formData.paid_date}
                      onChange={handleChange}
                    />
                    {formErrors.paid_date && (
                      <div className="invalid-feedback">
                        {formErrors.paid_date}
                      </div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Towards</label>
                    <input
                      type="text"
                      name="towards"
                      className="form-control"
                      placeholder="e.g. Course Fee, 1st Installment"
                      value={formData.towards}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Payment Mode</label>
                    <select
                      name="payment_mode"
                      className="form-select"
                      value={formData.payment_mode}
                      onChange={handleChange}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Card">Card</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  {["Cheque", "Card"].includes(formData.payment_mode) && (
                    <>
                      <div className="col-md-3">
                        <label className="form-label">
                          {formData.payment_mode} No
                        </label>
                        <input
                          type="text"
                          name="cheque_card_no"
                          className={`form-control ${formErrors.cheque_card_no ? "is-invalid" : ""}`}
                          value={formData.cheque_card_no}
                          onChange={handleChange}
                        />
                        {formErrors.cheque_card_no && (
                          <div className="invalid-feedback">
                            {formErrors.cheque_card_no}
                          </div>
                        )}
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          name="bank_name"
                          className={`form-control ${formErrors.bank_name ? "is-invalid" : ""}`}
                          value={formData.bank_name}
                          onChange={handleChange}
                        />
                        {formErrors.bank_name && (
                          <div className="invalid-feedback">
                            {formErrors.bank_name}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {formData.amount_paid && (
                    <div className="col-12">
                      <div className="text-muted small fst-italic">
                        Amount in Words: {numberToWords(formData.amount_paid)}
                      </div>
                    </div>
                  )}

                  <div className="col-md-2 d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary flex-fill"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Saving..."
                        : editingPaymentId
                          ? "Update"
                          : "Save"}
                    </button>
                    {editingPaymentId && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={cancelEditPayment}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}

              <h6 className="mt-4 mb-2">Payment History</h6>
              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Enrolment No</th>
                      <th>Bill No</th>
                      <th>Amount Paid</th>
                      <th>Paid Date</th>
                      <th>Towards</th>
                      <th>Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPerson.FeePayments || []).length === 0 ? (
                      <tr>
                        <td className="text-center text-muted" colSpan={7}>
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      selectedPerson.FeePayments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.enrol_no ?? "-"}</td>
                          <td>{p.bill_no ?? "-"}</td>
                          <td>{p.amount_paid ?? "-"}</td>
                          <td>{p.paid_date ?? "-"}</td>
                          <td>{p.towards ?? "-"}</td>
                          <td>{p.payment_mode ?? "-"}</td>
                          <td className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => startEditPayment(p)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deletePayment(p.id)}
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
            </>
          )}
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
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
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
                    const info = computeFeeInfo(a);
                    return (
                      <tr key={a.id}>
                        <td>{index + 1}</td>
                        <td>{a.applicant_name}</td>
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
                          {info.status && (
                            <span
                              className={`badge ${
                                info.status === "Paid"
                                  ? "bg-success"
                                  : "bg-warning"
                              }`}
                            >
                              {info.status}
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => selectPerson(a.id)}
                          >
                            Select
                          </button>
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
