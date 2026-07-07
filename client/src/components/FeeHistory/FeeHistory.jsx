import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Modal } from "bootstrap";
import API from "../../api/api";

const initialForm = {
  enrol_no: "",
  bill_no: "",
  amount_paid: "",
  paid_date: "",
};

function FeeHistory() {
  const { id } = useParams();
  const modalRef = useRef(null);

  const [applicantName, setApplicantName] = useState("");
  const [totalFee, setTotalFee] = useState(null);
  const [firstInstallment, setFirstInstallment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchFees = async () => {
    try {
      const response = await API.get(`/admissions/${id}`);
      setApplicantName(response.data.data.applicant_name);
      setTotalFee(response.data.data.total_fee);
      setFirstInstallment(response.data.data.first_installment_amount);
      setPayments(response.data.data.FeePayments || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load fee payment history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const forceCleanup = () => {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    };
    modalEl.addEventListener("hidden.bs.modal", forceCleanup);
    return () => modalEl.removeEventListener("hidden.bs.modal", forceCleanup);
  }, [loading]);

  const totalPaid = payments.reduce(
    (sum, p) => sum + (Number(p.amount_paid) || 0),
    0
  );
  const totalFeeNum = totalFee !== null ? Number(totalFee) : null;
  const balance = totalFeeNum !== null ? totalFeeNum - totalPaid : null;
  const overallStatus =
    totalFeeNum === null ? null : balance <= 0 ? "Paid" : "Pending";

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
    if (!formData.amount_paid) errors.amount_paid = "Amount is required.";
    else if (Number(formData.amount_paid) <= 0)
      errors.amount_paid = "Amount must be greater than 0.";
    else if (balance !== null && Number(formData.amount_paid) > balance) {
      errors.amount_paid = `Amount exceeds remaining balance of Rs. ${balance}.`;
    }
    if (!formData.paid_date) errors.paid_date = "Paid date is required.";
    return errors;
  };

  const openModal = () => {
    const instance = Modal.getOrCreateInstance(modalRef.current);
    instance.show();
  };

  const closeModal = () => {
    const instance = Modal.getOrCreateInstance(modalRef.current);
    instance.hide();
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
      const response = await API.post("/fee-payments", {
        admission_id: id,
        ...formData,
        status: "Paid",
      });
      setFormData(initialForm);
      closeModal();
      await fetchFees();
      setToast({
        variant: "success",
        message: response.data.message || "Fee payment added successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message:
          err.response?.data?.message || "Failed to add fee payment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center text-muted p-4">Loading...</p>;
  if (error)
    return <p className="text-center text-danger p-4">{error}</p>;

  return (
    <div className="card shadow-sm mx-auto" style={{ maxWidth: "900px" }}>
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
          <Link to="/" className="text-decoration-none">
            <i className="bi bi-arrow-left"></i> Back to Admission List
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
            onClick={openModal}
            disabled={overallStatus === "Paid"}
          >
            <i className="bi bi-plus-lg"></i> Add Payment
          </button>
        </div>

        <h4 className="mb-3">Fee Payment History — {applicantName}</h4>

        <div className="row g-2 mb-3">
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 text-center h-100">
              <div className="text-muted small">Total Fee</div>
              <div className="fw-bold">
                {totalFeeNum !== null ? `Rs. ${totalFeeNum}` : "Not set"}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 text-center h-100">
              <div className="text-muted small">First Installment</div>
              <div className="fw-bold">
                {firstInstallment !== null && firstInstallment !== ""
                  ? `Rs. ${firstInstallment}`
                  : "Not set"}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 text-center h-100">
              <div className="text-muted small">Total Paid</div>
              <div className="fw-bold text-success">Rs. {totalPaid}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 text-center h-100">
              <div className="text-muted small">Balance</div>
              <div className="fw-bold text-danger">
                {balance !== null ? `Rs. ${Math.max(balance, 0)}` : "-"}
              </div>
            </div>
          </div>
        </div>

        {overallStatus && (
          <p className="mb-3">
            Fee Status:{" "}
            <span
              className={`badge fs-6 ${
                overallStatus === "Paid" ? "bg-success" : "bg-warning"
              }`}
            >
              {overallStatus}
            </span>
          </p>
        )}

        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-primary">
              <tr>
                <th>Enrolment No</th>
                <th>Bill No</th>
                <th>Amount Paid</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td className="text-center text-muted" colSpan={4}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.enrol_no ?? "-"}</td>
                    <td>{p.bill_no ?? "-"}</td>
                    <td>{p.amount_paid ?? "-"}</td>
                    <td>{p.paid_date ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addPaymentModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Fee Payment</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <div className="alert alert-secondary py-2 px-3 mb-0 small">
                      Total Fee: <strong>{totalFeeNum ?? "Not set"}</strong>
                      {" | "}
                      Already Paid: <strong>Rs. {totalPaid}</strong>
                      {" | "}
                      Remaining Balance:{" "}
                      <strong>
                        {balance !== null ? `Rs. ${Math.max(balance, 0)}` : "-"}
                      </strong>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Enrolment No</label>
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
                  <div className="col-md-6">
                    <label className="form-label">Amount Paid (Rs.)</label>
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
                  <div className="col-md-6">
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
                  {submitting ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeeHistory;
