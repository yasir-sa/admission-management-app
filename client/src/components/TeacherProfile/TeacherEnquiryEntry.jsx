import { useRef, useState } from "react";
import { Modal } from "bootstrap";
import API from "../../api/api";

const today = () => new Date().toISOString().slice(0, 10);

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
const UPDATE_CHANNELS = ["SMS", "WhatsApp", "Telephone"];
const SOURCE_SUB_OPTIONS = {
  Newspaper: ["Hindu", "Dinathanthi", "Dinamalar", "Others"],
  Television: ["Sun TV", "Raj TV", "Vijay TV", "Jaya TV", "Others"],
  Others: ["Pamphlet", "Banner", "Wall Posters", "Q&A Books", "CSCians", "Faculties"],
};

const initialState = {
  sheet_date: today(),
  initial: "",
  applicant_name: "",
  father_initial: "",
  father_husband_name: "",
  address: "",
  pin_code: "",
  mobile_no: "",
  telephone_no: "",
  email: "",
  sex: "",
  religion: "",
  community: "",
  educational_qualification: "",
  qualification_status: "",
  qualification_year: "",
  qualification_subject: "",
  occupation: "",
  family_income: "",
  prior_course_institution: "",
  prior_course_subject: "",
  study_reason: "",
  course_interested: "",
  preferred_timings: "",
  plan_to_join: "",
  source: "",
  heard_source: [],
  interested_updates: [],
  enrol_no: "",
  course: "",
  date_of_joining: "",
  counselling_handled_by: "",
  counselling_date: "",
  counselling_time: "",
};

// Write-only — same idea as TeacherFeeEntry.jsx: a teacher can log a new
// enquiry directly, but has no list/history view here (see
// teacherAsAdmin.js). Field-for-field the same as the admin's own Add
// Information Sheet modal (InformationSheetEntry.jsx) — same radios,
// same selects, same option lists — except "Course Interested to Join"
// is a plain text field here instead of a dropdown, since that dropdown
// is populated from /courses, an admin-auth-only endpoint.
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

  const toggleUpdateChannel = (channel) => {
    setFormData((prev) => {
      const has = prev.interested_updates.includes(channel);
      return {
        ...prev,
        interested_updates: has
          ? prev.interested_updates.filter((c) => c !== channel)
          : [...prev.interested_updates, channel],
      };
    });
  };

  const toggleHeardSource = (option) => {
    setFormData((prev) => {
      const has = prev.heard_source.includes(option);
      return {
        ...prev,
        heard_source: has
          ? prev.heard_source.filter((o) => o !== option)
          : [...prev.heard_source, option],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.applicant_name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        heard_source: formData.heard_source.join(", "),
        interested_updates: formData.interested_updates.join(", "),
      };
      await API.post("/teacher-auth/entry/enquiry", payload);
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

      <div className="modal fade" id="teacherInfoSheetModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Information Sheet</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <div className="row g-3 mb-2">
                  <div className="col-md-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      name="sheet_date"
                      className="form-control"
                      value={formData.sheet_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="w-100"></div>
                  <div className="col-md-2">
                    <label className="form-label">Initial</label>
                    <input
                      type="text"
                      name="initial"
                      className="form-control"
                      value={formData.initial}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-5">
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
                  <div className="w-100"></div>
                  <div className="col-md-2">
                    <label className="form-label">Father Initial</label>
                    <input
                      type="text"
                      name="father_initial"
                      className="form-control"
                      value={formData.father_initial}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Father's / Husband's Name</label>
                    <input
                      type="text"
                      name="father_husband_name"
                      className="form-control"
                      value={formData.father_husband_name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      name="address"
                      className="form-control"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Pin Code</label>
                    <input
                      type="text"
                      name="pin_code"
                      maxLength={6}
                      className="form-control"
                      value={formData.pin_code}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Mobile No</label>
                    <input
                      type="text"
                      name="mobile_no"
                      className="form-control"
                      value={formData.mobile_no}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-3">
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

                  <div className="col-md-4">
                    <label className="form-label d-block">Sex</label>
                    {["M", "F"].map((opt) => (
                      <div className="form-check form-check-inline" key={opt}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="sex"
                          value={opt}
                          checked={formData.sex === opt}
                          onChange={handleChange}
                        />
                        <label className="form-check-label">{opt}</label>
                      </div>
                    ))}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label d-block">Religion</label>
                    {["Hindu", "Christian", "Muslim", "Others"].map((opt) => (
                      <div className="form-check form-check-inline" key={opt}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="religion"
                          value={opt}
                          checked={formData.religion === opt}
                          onChange={handleChange}
                        />
                        <label className="form-check-label">{opt}</label>
                      </div>
                    ))}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label d-block">Community</label>
                    {["OC", "BC", "MBC", "ST/SC", "Others"].map((opt) => (
                      <div className="form-check form-check-inline" key={opt}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="community"
                          value={opt}
                          checked={formData.community === opt}
                          onChange={handleChange}
                        />
                        <label className="form-check-label">{opt}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Educational Qualification</label>
                    <select
                      name="educational_qualification"
                      className="form-select"
                      value={formData.educational_qualification}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      {QUALIFICATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Qualification Status</label>
                    <select
                      name="qualification_status"
                      className="form-select"
                      value={formData.qualification_status}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      <option value="Completed">Completed</option>
                      <option value="Undergoing">Undergoing</option>
                    </select>
                  </div>

                  {formData.qualification_status === "Undergoing" && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label">Which Year</label>
                        <input
                          type="text"
                          name="qualification_year"
                          className="form-control"
                          value={formData.qualification_year}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Subject</label>
                        <input
                          type="text"
                          name="qualification_subject"
                          className="form-control"
                          value={formData.qualification_subject}
                          onChange={handleChange}
                        />
                      </div>
                    </>
                  )}

                  <div className="col-md-4">
                    <label className="form-label d-block">Are You (Occupation)</label>
                    {["Student", "House Wife", "Employed", "Un-employed", "Business"].map((opt) => (
                      <div className="form-check form-check-inline" key={opt}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="occupation"
                          value={opt}
                          checked={formData.occupation === opt}
                          onChange={handleChange}
                        />
                        <label className="form-check-label">{opt}</label>
                      </div>
                    ))}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Family Income Per Month</label>
                    <select
                      name="family_income"
                      className="form-select"
                      value={formData.family_income}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      <option value="Less than 8000">Less than Rs. 8,000</option>
                      <option value="8001-15000">Rs. 8,001 - 15,000</option>
                      <option value="More than 15000">More than Rs. 15,000</option>
                    </select>
                  </div>
                  <div className="col-md-6"></div>

                  <div className="col-md-6">
                    <label className="form-label">Prior Computer Course — Institution</label>
                    <input
                      type="text"
                      name="prior_course_institution"
                      className="form-control"
                      value={formData.prior_course_institution}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Prior Computer Course — Subject</label>
                    <input
                      type="text"
                      name="prior_course_subject"
                      className="form-control"
                      value={formData.prior_course_subject}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Why Study Computer Course</label>
                    <select
                      name="study_reason"
                      className="form-select"
                      value={formData.study_reason}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      <option value="For a Job">For a Job</option>
                      <option value="Additional Qualification">Additional Qualification</option>
                      <option value="Gaining Knowledge">Gaining Knowledge</option>
                      <option value="Sponsored by Company">Sponsored by Company</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Course Interested to Join</label>
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
                      placeholder="e.g. 11:00am-12:00pm"
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
                      {PLAN_TO_JOIN_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Source</label>
                    <select
                      name="source"
                      className="form-select"
                      value={formData.source}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label d-block">
                      How Did You Know About Us (select all that apply)
                    </label>
                    <div className="row g-3">
                      {Object.entries(SOURCE_SUB_OPTIONS).map(([category, options]) => (
                        <div className="col-md-4" key={category}>
                          <div className="fw-bold small text-muted mb-1">{category}</div>
                          {options.map((opt) => {
                            const value = `${category}: ${opt}`;
                            return (
                              <div className="form-check" key={opt}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={formData.heard_source.includes(value)}
                                  onChange={() => toggleHeardSource(value)}
                                />
                                <label className="form-check-label">{opt}</label>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label d-block">Interested in Updates Via</label>
                    {UPDATE_CHANNELS.map((channel) => (
                      <div className="form-check form-check-inline" key={channel}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.interested_updates.includes(channel)}
                          onChange={() => toggleUpdateChannel(channel)}
                        />
                        <label className="form-check-label">{channel}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded p-3 mt-4 bg-light position-relative">
                  <span
                    className="badge bg-secondary position-absolute"
                    style={{ top: "-10px", left: "16px" }}
                  >
                    For Office Use Only
                  </span>
                  <div className="row g-3 pt-2">
                    <div className="col-md-4">
                      <label className="form-label">E.No</label>
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
                      <label className="form-label">DOJ</label>
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
                    <div className="col-md-3">
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
                      <label className="form-label d-block">Counselling Time</label>
                      <input
                        type="text"
                        name="counselling_time"
                        className="form-control"
                        placeholder="e.g. 8:30 AM"
                        value={formData.counselling_time}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
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
