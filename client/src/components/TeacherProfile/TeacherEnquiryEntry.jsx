import { useState } from "react";
import API from "../../api/api";

const today = () => new Date().toISOString().slice(0, 10);

const initialState = {
  applicant_name: "",
  father_husband_name: "",
  mobile_no: "",
  address: "",
  sex: "",
  course_interested: "",
  preferred_timings: "",
  study_reason: "",
  source: "",
  sheet_date: today(),
};

// Write-only — same idea as TeacherFeeEntry.jsx: a teacher can log a new
// enquiry directly, but has no list/history view of existing enquiries
// here (see teacherAsAdmin.js). This is a streamlined subset of the
// admin's own Information Sheet fields — the essentials for a walk-in
// enquiry, not the full counselling-follow-up field set.
function TeacherEnquiryEntry() {
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.applicant_name.trim()) return;
    setSubmitting(true);
    try {
      await API.post("/teacher-auth/entry/enquiry", formData);
      setToast({ variant: "success", message: "Enquiry saved successfully." });
      setFormData({ ...initialState, sheet_date: today() });
    } catch (err) {
      setToast({ variant: "danger", message: err.response?.data?.message || "Failed to save enquiry." });
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
            <label className="form-label">Name</label>
            <input
              type="text"
              name="applicant_name"
              className="form-control"
              value={formData.applicant_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Father's / Husband's Name</label>
            <input
              type="text"
              name="father_husband_name"
              className="form-control"
              value={formData.father_husband_name}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Mobile No</label>
            <input
              type="text"
              name="mobile_no"
              className="form-control"
              value={formData.mobile_no}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Sex</label>
            <select name="sex" className="form-select" value={formData.sex} onChange={handleChange}>
              <option value="">Select</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Enquiry Date</label>
            <input
              type="date"
              name="sheet_date"
              className="form-control"
              value={formData.sheet_date}
              onChange={handleChange}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Address</label>
            <textarea
              name="address"
              className="form-control"
              rows={2}
              value={formData.address}
              onChange={handleChange}
            ></textarea>
          </div>
          <div className="col-md-6">
            <label className="form-label">Course Interested</label>
            <input
              type="text"
              name="course_interested"
              className="form-control"
              value={formData.course_interested}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Preferred Timings</label>
            <input
              type="text"
              name="preferred_timings"
              className="form-control"
              value={formData.preferred_timings}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Reason for Study</label>
            <input
              type="text"
              name="study_reason"
              className="form-control"
              value={formData.study_reason}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">How did you hear about us?</label>
            <input
              type="text"
              name="source"
              className="form-control"
              value={formData.source}
              onChange={handleChange}
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Enquiry"}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}

export default TeacherEnquiryEntry;
