import { useRef, useState } from "react";
import { Modal } from "bootstrap";
import API from "../../api/api";

const today = () => new Date().toISOString().slice(0, 10);

const SEX_OPTIONS = ["M", "F"];
const RELIGION_OPTIONS = ["Hindu", "Christian", "Muslim", "Others"];
const COMMUNITY_OPTIONS = ["OC", "BC", "MBC", "ST/SC"];
const OCCUPATION_OPTIONS = ["Student", "House Wife", "Employed", "Un-employed", "Business"];
const QUALIFICATION_OPTIONS = ["10th & Below", "12th", "Diploma", "UG", "PG", "Other"];
const SOURCE_OPTIONS = ["Phone", "Direct", "Website", "Others"];
const PLAN_TO_JOIN_OPTIONS = [
  "New",
  "Immediately",
  "Within a week",
  "Within a month",
  "Called - No Answer",
  "Spoke - Interested",
  "Coming Directly",
  "Follow Up",
];

const initialState = {
  applicant_name: "",
  initial: "",
  father_husband_name: "",
  father_initial: "",
  address: "",
  mobile_no: "",
  telephone_no: "",
  email: "",
  sex: "",
  religion: "",
  community: "",
  educational_qualification: "",
  occupation: "",
  pin_code: "",
  qualification_status: "",
  qualification_year: "",
  qualification_subject: "",
  prior_course_institution: "",
  prior_course_subject: "",
  family_income: "",
  study_reason: "",
  course_interested: "",
  preferred_timings: "",
  plan_to_join: "",
  heard_source: "",
  source: "",
  interested_updates: "",
  sheet_date: today(),
  enrol_no: "",
  course: "",
  date_of_joining: "",
  counselling_handled_by: "",
  counselling_date: "",
  counselling_time: "",
};

// Write-only — same idea as TeacherFeeEntry.jsx: a teacher can log a new
// enquiry directly, but has no list/history view of existing enquiries
// here (see teacherAsAdmin.js). Full field set, matching the admin's own
// Information Sheet — just without the list/course-lookup parts of that
// page, which a teacher shouldn't have read access to anyway.
function TeacherEnquiryEntry() {
  const modalRef = useRef(null);
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const openModal = () => {
    setFormData({ ...initialState, sheet_date: today() });
    Modal.getOrCreateInstance(modalRef.current).show();
  };

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
      Modal.getOrCreateInstance(modalRef.current).hide();
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
        <p className="text-muted small">
          Add a new enquiry directly — it's saved the same way an admin's own entry is.
        </p>
        <button type="button" className="btn btn-primary" onClick={openModal}>
          <i className="bi bi-plus-lg me-1"></i> Add Enquiry
        </button>
      </div>

      <div className="modal fade" id="addTeacherEnquiryModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Information Sheet</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
            <div className="col-md-3">
              <label className="form-label">Initial</label>
              <input
                type="text"
                name="initial"
                className="form-control"
                value={formData.initial}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sheet Date</label>
              <input
                type="date"
                name="sheet_date"
                className="form-control"
                value={formData.sheet_date}
                onChange={handleChange}
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
            <div className="col-md-6">
              <label className="form-label">Father Initial</label>
              <input
                type="text"
                name="father_initial"
                className="form-control"
                value={formData.father_initial}
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
            <div className="col-md-4">
              <label className="form-label">Pin Code</label>
              <input
                type="text"
                name="pin_code"
                className="form-control"
                maxLength={6}
                value={formData.pin_code}
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
              <label className="form-label">Telephone No</label>
              <input
                type="text"
                name="telephone_no"
                className="form-control"
                value={formData.telephone_no}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Sex</label>
              <select name="sex" className="form-select" value={formData.sex} onChange={handleChange}>
                <option value="">Select</option>
                {SEX_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Religion</label>
              <select name="religion" className="form-select" value={formData.religion} onChange={handleChange}>
                <option value="">Select</option>
                {RELIGION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Community</label>
              <select
                name="community"
                className="form-select"
                value={formData.community}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {COMMUNITY_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Occupation</label>
              <select
                name="occupation"
                className="form-select"
                value={formData.occupation}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {OCCUPATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Educational Qualification</label>
              <select
                name="educational_qualification"
                className="form-select"
                value={formData.educational_qualification}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {QUALIFICATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Family Income</label>
              <input
                type="text"
                name="family_income"
                className="form-control"
                value={formData.family_income}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Qualification Status</label>
              <input
                type="text"
                name="qualification_status"
                className="form-control"
                value={formData.qualification_status}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Qualification Year</label>
              <input
                type="text"
                name="qualification_year"
                className="form-control"
                value={formData.qualification_year}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Qualification Subject</label>
              <input
                type="text"
                name="qualification_subject"
                className="form-control"
                value={formData.qualification_subject}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Prior Course Institution</label>
              <input
                type="text"
                name="prior_course_institution"
                className="form-control"
                value={formData.prior_course_institution}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Prior Course Subject</label>
              <input
                type="text"
                name="prior_course_subject"
                className="form-control"
                value={formData.prior_course_subject}
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
              <label className="form-label">Plan to Join</label>
              <select
                name="plan_to_join"
                className="form-select"
                value={formData.plan_to_join}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {PLAN_TO_JOIN_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">How did you hear about us?</label>
              <input
                type="text"
                name="heard_source"
                className="form-control"
                value={formData.heard_source}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Source</label>
              <select name="source" className="form-select" value={formData.source} onChange={handleChange}>
                <option value="">Select</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Interested Updates</label>
              <input
                type="text"
                name="interested_updates"
                className="form-control"
                value={formData.interested_updates}
                onChange={handleChange}
              />
            </div>

            <div className="col-12">
              <hr />
              <div className="text-muted small text-uppercase fw-bold mb-2">
                If already counselled / admitted
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Enrol No</label>
              <input
                type="text"
                name="enrol_no"
                className="form-control"
                value={formData.enrol_no}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Course</label>
              <input
                type="text"
                name="course"
                className="form-control"
                value={formData.course}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Date of Joining</label>
              <input
                type="date"
                name="date_of_joining"
                className="form-control"
                value={formData.date_of_joining}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Counselling Handled By</label>
              <input
                type="text"
                name="counselling_handled_by"
                className="form-control"
                value={formData.counselling_handled_by}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Counselling Date</label>
              <input
                type="date"
                name="counselling_date"
                className="form-control"
                value={formData.counselling_date}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Counselling Time</label>
              <input
                type="text"
                name="counselling_time"
                className="form-control"
                placeholder="4 to 8 PM"
                value={formData.counselling_time}
                onChange={handleChange}
              />
            </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherEnquiryEntry;
