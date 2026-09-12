import { useEffect, useRef, useState } from "react";
import API from "../../api/api";

const initialState = {
  bill_no: "",
  enrol_no: "",
  amount: "",
  paid_date: "",
  payment_mode: "Cash",
  description: "",
};

// Write-only — a teacher can submit a fee entry directly into the admin's
// own data, but has no list/history view here (see teacherAsAdmin.js).
// The one exception: looking up the ONE student they just typed the
// enrol_no for, so they can see if/how much that student already paid
// before adding a new entry — never a list of other students.
function TeacherFeeEntry() {
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [feeStatus, setFeeStatus] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lookupTimer = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Debounced on every keystroke (not onBlur) so the status appears while
  // still typing, not only after clicking away — 400ms is short enough to
  // feel immediate but long enough not to fire on every single character.
  useEffect(() => {
    const enrolNo = formData.enrol_no.trim();
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!enrolNo) {
      setFeeStatus(null);
      return;
    }
    setLookingUp(true);
    lookupTimer.current = setTimeout(async () => {
      try {
        const response = await API.get("/teacher-auth/entry/fee/lookup", {
          params: { enrol_no: enrolNo },
        });
        setFeeStatus(response.data.data);
      } catch {
        setFeeStatus(null);
      } finally {
        setLookingUp(false);
      }
    }, 400);
    return () => clearTimeout(lookupTimer.current);
  }, [formData.enrol_no]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    setSubmitting(true);
    try {
      await API.post("/teacher-auth/entry/fee", formData);
      setToast({ variant: "success", message: "Fee entry saved successfully." });
      setFormData(initialState);
      setFeeStatus(null);
    } catch (err) {
      setToast({ variant: "danger", message: err.response?.data?.message || "Failed to save fee entry." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {toast && <div className={`alert alert-${toast.variant} py-2`}>{toast.message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Enrol No</label>
              <input
                type="text"
                name="enrol_no"
                className="form-control"
                value={formData.enrol_no}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Bill No</label>
              <input
                type="text"
                name="bill_no"
                className="form-control"
                value={formData.bill_no}
                onChange={handleChange}
              />
            </div>

            {lookingUp && <div className="col-12 text-muted small">Checking payment status...</div>}

            {feeStatus && (
              <div className="col-12">
                <div className="border rounded p-3 bg-light">
                  {feeStatus.student_name ? (
                    <>
                      <div className="fw-semibold mb-1">{feeStatus.student_name}</div>
                      <div className="d-flex gap-4 flex-wrap small mb-2">
                        <div>
                          <span className="text-muted">Total Fee: </span>
                          <strong>{feeStatus.total_fee != null ? `Rs. ${feeStatus.total_fee}` : "-"}</strong>
                        </div>
                        <div>
                          <span className="text-muted">Total Paid: </span>
                          <strong className="text-success">Rs. {feeStatus.total_paid}</strong>
                        </div>
                        <div>
                          <span className="text-muted">Balance: </span>
                          <strong className={feeStatus.balance > 0 ? "text-danger" : "text-success"}>
                            {feeStatus.balance != null ? `Rs. ${feeStatus.balance}` : "-"}
                          </strong>
                        </div>
                      </div>
                      {feeStatus.payments.length === 0 ? (
                        <div className="text-muted small">No payments recorded yet.</div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm mb-0 small">
                            <thead>
                              <tr>
                                <th>Bill No</th>
                                <th>Amount</th>
                                <th>Paid Date</th>
                                <th>Mode</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeStatus.payments.map((p, i) => (
                                <tr key={i}>
                                  <td>{p.bill_no || "-"}</td>
                                  <td>Rs. {p.amount}</td>
                                  <td>{p.paid_date || "-"}</td>
                                  <td>{p.payment_mode || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted small">
                      No admission found for this Enrol No — you can still add a fee entry against it.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="col-md-4">
              <label className="form-label">Amount (Rs.)</label>
              <input
                type="number"
                name="amount"
                className="form-control"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Paid Date</label>
              <input
                type="date"
                name="paid_date"
                className="form-control"
                value={formData.paid_date}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
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
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-control"
                rows={2}
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Save Fee Entry"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TeacherFeeEntry;
