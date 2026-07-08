import { useEffect, useRef, useState } from "react";
import { Modal } from "bootstrap";
import API from "../../api/api";

const initialForm = {
  applicant_name: "",
  father_husband_name: "",
  address: "",
  mobile_no: "",
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
  heard_source_detail: "",
  interested_updates: [],
  date_of_joining: "",
  counselling_handled_by: "",
  counselling_date: "",
  counselling_time: "",
};

const UPDATE_CHANNELS = ["SMS", "WhatsApp", "Telephone"];

const MOBILE_SEGMENT_LENGTH = 10;

const SOURCE_SUB_OPTIONS = {
  Newspaper: ["Hindu", "Dinathanthi", "Dinamalar", "Others"],
  Television: ["Sun TV", "Raj TV", "Vijay TV", "Jaya TV", "Others"],
  Others: [
    "Pamphlet",
    "Banner",
    "Wall Posters",
    "Q&A Books",
    "CSCians",
    "Faculties",
  ],
};

const PERSONAL_FIELDS = [
  "applicant_name",
  "father_husband_name",
  "address",
  "mobile_no",
  "email",
  "sex",
  "religion",
  "community",
  "educational_qualification",
  "occupation",
];

const VIEW_FIELDS = [
  { key: "applicant_name", label: "Name" },
  { key: "father_husband_name", label: "Father's / Husband's Name" },
  { key: "address", label: "Address" },
  { key: "mobile_no", label: "Mobile / Telephone No" },
  { key: "email", label: "Email" },
  { key: "sex", label: "Sex" },
  { key: "religion", label: "Religion" },
  { key: "community", label: "Community" },
  { key: "educational_qualification", label: "Qualification" },
  { key: "occupation", label: "Occupation" },
  { key: "pin_code", label: "Pin Code" },
  { key: "qualification_status", label: "Qualification Status" },
  { key: "qualification_year", label: "Which Year" },
  { key: "qualification_subject", label: "Qualification Subject" },
  { key: "prior_course_institution", label: "Prior Course Institution" },
  { key: "prior_course_subject", label: "Prior Course Subject" },
  { key: "family_income", label: "Family Income Per Month" },
  { key: "study_reason", label: "Why Study Computer Course" },
  { key: "course_interested", label: "Course Interested to Join" },
  { key: "preferred_timings", label: "Preferred Timings" },
  { key: "plan_to_join", label: "Plan to Join" },
  { key: "heard_source", label: "How Did You Know About Us" },
  { key: "heard_source_detail", label: "Source Detail" },
  { key: "interested_updates", label: "Interested in Updates Via" },
  { key: "date_of_joining", label: "Date of Joining" },
  { key: "counselling_handled_by", label: "Counselling Handled By" },
  { key: "counselling_date", label: "Counselling Date" },
  { key: "counselling_time", label: "Counselling Time" },
];

function InformationSheetEntry() {
  const modalRef = useRef(null);

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Not Filled");
  const [activePerson, setActivePerson] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

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

  const isFilled = (a) => Boolean(a.InformationSheet);

  const filteredAdmissions = admissions
    .filter((a) => (statusFilter === "Filled" ? isFilled(a) : !isFilled(a)))
    .filter((a) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (a.applicant_name || "").toLowerCase().includes(term) ||
        (a.mobile_no || "").toLowerCase().includes(term) ||
        (a.aadhar_no || "").toLowerCase().includes(term)
      );
    });

  const openModal = (person, mode) => {
    setActivePerson(person);
    setViewMode(mode === "view");
    const sheet = person.InformationSheet;
    setFormData({
      applicant_name: person.applicant_name || "",
      father_husband_name: person.father_husband_name || "",
      address: person.address || "",
      mobile_no: person.mobile_no || "",
      email: person.email || "",
      sex: person.sex || "",
      religion: person.religion || "",
      community: person.community || "",
      educational_qualification: person.educational_qualification || "",
      occupation: person.occupation || "",
      pin_code: sheet?.pin_code || "",
      qualification_status: sheet?.qualification_status || "",
      qualification_year: sheet?.qualification_year || "",
      qualification_subject: sheet?.qualification_subject || "",
      prior_course_institution: sheet?.prior_course_institution || "",
      prior_course_subject: sheet?.prior_course_subject || "",
      family_income: sheet?.family_income || "",
      study_reason: sheet?.study_reason || "",
      course_interested: sheet?.course_interested || "",
      preferred_timings: sheet?.preferred_timings || "",
      plan_to_join: sheet?.plan_to_join || "",
      heard_source: sheet?.heard_source || "",
      heard_source_detail: sheet?.heard_source_detail || "",
      interested_updates: sheet?.interested_updates
        ? sheet.interested_updates.split(",").map((s) => s.trim())
        : [],
      date_of_joining: sheet?.date_of_joining || "",
      counselling_handled_by: sheet?.counselling_handled_by || "",
      counselling_date: sheet?.counselling_date || "",
      counselling_time: sheet?.counselling_time || "",
    });
    const instance = Modal.getOrCreateInstance(modalRef.current);
    instance.show();
  };

  const closeModal = () => {
    const instance = Modal.getOrCreateInstance(modalRef.current);
    instance.hide();
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;

    if (name === "mobile_no") {
      // Allow digits and a single "/" so both mobile & telephone number can be entered (e.g. 9876543210/5425433)
      let v = value.replace(/[^\d/]/g, "");
      const firstSlash = v.indexOf("/");
      if (firstSlash !== -1) {
        v =
          v.slice(0, firstSlash + 1) +
          v.slice(firstSlash + 1).replace(/\//g, "");
      }
      cleanValue = v
        .split("/")
        .map((part) => part.slice(0, MOBILE_SEGMENT_LENGTH))
        .join("/");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: cleanValue,
      ...(name === "heard_source" ? { heard_source_detail: "" } : {}),
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const personalPayload = {};
      const sheetPayload = { ...formData };
      PERSONAL_FIELDS.forEach((field) => {
        personalPayload[field] = formData[field];
        delete sheetPayload[field];
      });

      await API.put(`/admissions/${activePerson.id}`, personalPayload);

      const payload = {
        admission_id: activePerson.id,
        ...sheetPayload,
        interested_updates: sheetPayload.interested_updates.join(", "),
      };
      const response = await API.post("/information-sheets", payload);
      closeModal();
      await fetchAdmissions();
      setToast({
        variant: "success",
        message:
          response.data.message || "Information sheet saved successfully",
      });
    } catch (err) {
      setToast({
        variant: "danger",
        message:
          err.response?.data?.message || "Failed to save information sheet.",
      });
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

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Information Sheet</h4>
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "Filled" ? "btn-success" : "btn-outline-success"}`}
                onClick={() => setStatusFilter("Filled")}
              >
                Filled
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "Not Filled" ? "btn-warning" : "btn-outline-warning"}`}
                onClick={() => setStatusFilter("Not Filled")}
              >
                Not Filled
              </button>
            </div>
          </div>

          <div className="input-group mb-3" style={{ maxWidth: "350px" }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Name, Mobile No, or Aadhar No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted" colSpan={6}>
                      No {statusFilter.toLowerCase()} records found.
                    </td>
                  </tr>
                ) : (
                  filteredAdmissions.map((a, index) => (
                    <tr key={a.id}>
                      <td>{index + 1}</td>
                      <td>{a.applicant_name}</td>
                      <td>{a.mobile_no}</td>
                      <td>{a.course_name}</td>
                      <td>
                        <span
                          className={`badge ${isFilled(a) ? "bg-success" : "bg-warning"}`}
                        >
                          {isFilled(a) ? "Filled" : "Not Filled"}
                        </span>
                      </td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openModal(a, "edit")}
                        >
                          Select
                        </button>
                        {isFilled(a) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openModal(a, "view")}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="modal fade" id="infoSheetModal" tabIndex="-1" ref={modalRef}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {viewMode ? "View Information Sheet — " : "Information Sheet — "}
                {activePerson?.applicant_name}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div
                className="modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {viewMode ? (
                  <div className="row g-3">
                    {VIEW_FIELDS.map((field) => {
                      const rawValue = formData[field.key];
                      const displayValue = Array.isArray(rawValue)
                        ? rawValue.join(", ")
                        : rawValue;
                      return (
                        <div className="col-md-4" key={field.key}>
                          <div className="text-muted small fw-bold text-uppercase">
                            {field.label}
                          </div>
                          <div>{displayValue || "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <fieldset disabled={viewMode}>
                  <div className="row g-3 mb-2">
                    <div className="col-md-4">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        name="applicant_name"
                        className="form-control"
                        value={formData.applicant_name}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Father's / Husband's Name
                      </label>
                      <input
                        type="text"
                        name="father_husband_name"
                        className="form-control"
                        value={formData.father_husband_name}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Mobile / Telephone No</label>
                      <input
                        type="text"
                        name="mobile_no"
                        className="form-control"
                        placeholder="e.g. 9876543210/5425433"
                        value={formData.mobile_no}
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
                    <div className="col-md-6">
                      <label className="form-label">
                        Educational Qualification
                      </label>
                      <input
                        type="text"
                        name="educational_qualification"
                        className="form-control"
                        value={formData.educational_qualification}
                        onChange={handleChange}
                      />
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
                      {["OC", "BC", "MBC", "ST/SC"].map((opt) => (
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
                    <div className="col-md-4">
                      <label className="form-label d-block">Occupation</label>
                      {[
                        "Student",
                        "House Wife",
                        "Employed",
                        "Un-employed",
                        "Business",
                      ].map((opt) => (
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
                  </div>

                  <hr />

                  <div className="row g-3">
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

                    <div className="col-md-6">
                      <label className="form-label">
                        Prior Computer Course — Institution
                      </label>
                      <input
                        type="text"
                        name="prior_course_institution"
                        className="form-control"
                        value={formData.prior_course_institution}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Prior Computer Course — Subject
                      </label>
                      <input
                        type="text"
                        name="prior_course_subject"
                        className="form-control"
                        value={formData.prior_course_subject}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Family Income Per Month
                      </label>
                      <select
                        name="family_income"
                        className="form-select"
                        value={formData.family_income}
                        onChange={handleChange}
                      >
                        <option value="">Select</option>
                        <option value="Less than 8000">
                          Less than Rs. 8,000
                        </option>
                        <option value="8001-15000">
                          Rs. 8,001 - 15,000
                        </option>
                        <option value="More than 15000">
                          More than Rs. 15,000
                        </option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Why Study Computer Course
                      </label>
                      <select
                        name="study_reason"
                        className="form-select"
                        value={formData.study_reason}
                        onChange={handleChange}
                      >
                        <option value="">Select</option>
                        <option value="For a Job">For a Job</option>
                        <option value="Additional Qualification">
                          Additional Qualification
                        </option>
                        <option value="Gaining Knowledge">
                          Gaining Knowledge
                        </option>
                        <option value="Sponsored by Company">
                          Sponsored by Company
                        </option>
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
                        <option value="Immediately">Immediately</option>
                        <option value="Within a week">Within a week</option>
                        <option value="Within a month">Within a month</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        How Did You Know About Us
                      </label>
                      <select
                        name="heard_source"
                        className="form-select"
                        value={formData.heard_source}
                        onChange={handleChange}
                      >
                        <option value="">Select</option>
                        <option value="Newspaper">Newspaper</option>
                        <option value="Television">Television</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    {formData.heard_source && (
                      <div className="col-12">
                        <label className="form-label d-block">
                          {formData.heard_source} — Which One
                        </label>
                        {SOURCE_SUB_OPTIONS[formData.heard_source].map(
                          (opt) => (
                            <div
                              className="form-check form-check-inline"
                              key={opt}
                            >
                              <input
                                className="form-check-input"
                                type="radio"
                                name="heard_source_detail"
                                value={opt}
                                checked={formData.heard_source_detail === opt}
                                onChange={handleChange}
                              />
                              <label className="form-check-label">
                                {opt}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label d-block">
                        Interested in Updates Via
                      </label>
                      {UPDATE_CHANNELS.map((channel) => (
                        <div
                          className="form-check form-check-inline"
                          key={channel}
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={formData.interested_updates.includes(
                              channel
                            )}
                            onChange={() => toggleUpdateChannel(channel)}
                          />
                          <label className="form-check-label">
                            {channel}
                          </label>
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
                        <label className="form-label">
                          Counselling Handled By
                        </label>
                        <input
                          type="text"
                          name="counselling_handled_by"
                          className="form-control"
                          value={formData.counselling_handled_by}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Counselling Date</label>
                        <input
                          type="date"
                          name="counselling_date"
                          className="form-control"
                          value={formData.counselling_date}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Counselling Time</label>
                        <input
                          type="time"
                          name="counselling_time"
                          className="form-control"
                          value={formData.counselling_time}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  {viewMode ? "Close" : "Cancel"}
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InformationSheetEntry;
