import { useState } from "react";
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
function TeacherFeeEntry() {
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    setSubmitting(true);
    try {
      await API.post("/teacher-auth/entry/fee", formData);
      setToast({ variant: "success", message: "Fee entry saved successfully." });
      setFormData(initialState);
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
