import { useRef, useState, useEffect } from "react";
import { Modal } from "bootstrap";
import API from "../../api/api";

const FIELD_LABELS = {
  course_name: "Course Name",
  session: "Session",
  applicant_name: "Name",
  father_husband_name: "Father's / Husband's Name",
  guardian_occupation: "Occupation of Father / Guardian",
  date_of_birth: "Date of Birth",
  age: "Age",
  sex: "Sex",
  educational_qualification: "Educational Qualification",
  religion: "Religion",
  community: "Community",
  occupation: "Occupation",
  aadhar_no: "Aadhar Card No",
  address: "Address",
  mobile_no: "Mobile No",
  email: "Email ID",
  company_name: "Company Name",
};

const REQUIRED_FIELDS = [
  "course_name",
  "session",
  "applicant_name",
  "father_husband_name",
  "guardian_occupation",
  "date_of_birth",
  "age",
  "sex",
  "educational_qualification",
  "religion",
  "community",
  "occupation",
  "aadhar_no",
  "address",
  "mobile_no",
  "email",
];

const NAME_ONLY_FIELDS = ["applicant_name", "father_husband_name"];
const NAME_PATTERN = /[^a-zA-Z.'\s]/g;

const DIGIT_ONLY_FIELDS = ["aadhar_no", "mobile_no"];
const DIGIT_PATTERN = /\D/g;
const DIGIT_LENGTHS = { aadhar_no: 12, mobile_no: 10 };

const initialState = {
  course_name: "",
  session: "",
  applicant_name: "",
  father_husband_name: "",
  guardian_occupation: "",
  date_of_birth: "",
  age: "",
  sex: "",
  educational_qualification: "",
  religion: "",
  community: "",
  occupation: "",
  aadhar_no: "",
  company_name: "",
  address: "",
  mobile_no: "",
  email: "",
  total_fee: "",
  first_installment_amount: "",
  bill_no: "",
  scheme: "",
  timings: "",
};

function AdmissionModal({ editingRecord, onSuccess }) {
  const modalRef = useRef(null);
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const isEditMode = Boolean(editingRecord && editingRecord.id);

  useEffect(() => {
    if (editingRecord) {
      const populated = {};
      Object.keys(initialState).forEach((key) => {
        populated[key] = editingRecord[key] ?? "";
      });
      setFormData(populated);
    } else {
      setFormData(initialState);
    }
    setErrors({});
  }, [editingRecord]);

  useEffect(() => {
    const modalEl = modalRef.current;
    const forceCleanup = () => {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    };
    modalEl.addEventListener("hidden.bs.modal", forceCleanup);
    return () => modalEl.removeEventListener("hidden.bs.modal", forceCleanup);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;
    let liveError = null;

    if (NAME_ONLY_FIELDS.includes(name)) {
      cleanValue = value.replace(NAME_PATTERN, "");
    } else if (DIGIT_ONLY_FIELDS.includes(name)) {
      cleanValue = value.replace(DIGIT_PATTERN, "");
      const maxLen = DIGIT_LENGTHS[name];
      if (cleanValue.length > maxLen) {
        liveError = `${FIELD_LABELS[name]} cannot exceed ${maxLen} digits.`;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: cleanValue }));
    setErrors((prev) => {
      const next = { ...prev };
      if (liveError) {
        next[name] = liveError;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};

    REQUIRED_FIELDS.forEach((field) => {
      if (formData[field].toString().trim() === "") {
        nextErrors[field] = `${FIELD_LABELS[field]} is required.`;
      }
    });

    DIGIT_ONLY_FIELDS.forEach((field) => {
      const value = formData[field];
      const requiredLength = DIGIT_LENGTHS[field];
      if (value && value.length !== requiredLength) {
        nextErrors[field] = `${FIELD_LABELS[field]} must be exactly ${requiredLength} digits.`;
      }
    });

    if (
      formData.occupation === "Employed" &&
      formData.company_name.trim() === ""
    ) {
      nextErrors.company_name =
        "Company Name is required since Occupation is Employed.";
    }

    return nextErrors;
  };

  const closeModal = () => {
    const instance = Modal.getInstance(modalRef.current);
    if (instance) instance.hide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const response = isEditMode
        ? await API.put(`/admissions/${editingRecord.id}`, formData)
        : await API.post("/admissions", formData);
      const successMessage =
        response.data.message ||
        (isEditMode
          ? "Admission updated successfully"
          : "Admission submitted successfully");
      setFormData(initialState);
      closeModal();
      if (onSuccess) onSuccess();
      setToast({ variant: "success", message: successMessage });
    } catch (error) {
      const field = error.response?.data?.field;
      const message =
        error.response?.data?.message ||
        "Something went wrong. Please try again.";

      if (field) {
        setErrors((prev) => ({ ...prev, [field]: message }));
      } else {
        setToast({ variant: "danger", message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <div
          className="toast-container position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1080 }}
        >
          <div
            className={`toast show text-white bg-${toast.variant}`}
            role="alert"
          >
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
      <div
        className="modal fade"
        id="addAdmissionModal"
        tabIndex="-1"
        ref={modalRef}
      >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEditMode ? "Edit Admission" : "Add Admission"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Course Name</label>
                  <input
                    type="text"
                    name="course_name"
                    className={`form-control ${errors.course_name ? "is-invalid" : ""}`}
                    value={formData.course_name}
                    onChange={handleChange}
                  />
                  {errors.course_name && (
                    <div className="invalid-feedback">{errors.course_name}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">Session</label>
                  <input
                    type="text"
                    name="session"
                    className={`form-control ${errors.session ? "is-invalid" : ""}`}
                    value={formData.session}
                    onChange={handleChange}
                  />
                  {errors.session && (
                    <div className="invalid-feedback">{errors.session}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Name Mr. / Mrs. / Ms.</label>
                  <input
                    type="text"
                    name="applicant_name"
                    className={`form-control ${errors.applicant_name ? "is-invalid" : ""}`}
                    value={formData.applicant_name}
                    onChange={handleChange}
                  />
                  {errors.applicant_name && (
                    <div className="invalid-feedback">
                      {errors.applicant_name}
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Father's / Husband's Name
                  </label>
                  <input
                    type="text"
                    name="father_husband_name"
                    className={`form-control ${errors.father_husband_name ? "is-invalid" : ""}`}
                    value={formData.father_husband_name}
                    onChange={handleChange}
                  />
                  {errors.father_husband_name && (
                    <div className="invalid-feedback">
                      {errors.father_husband_name}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Occupation of Father / Guardian
                  </label>
                  <input
                    type="text"
                    name="guardian_occupation"
                    className={`form-control ${errors.guardian_occupation ? "is-invalid" : ""}`}
                    value={formData.guardian_occupation}
                    onChange={handleChange}
                  />
                  {errors.guardian_occupation && (
                    <div className="invalid-feedback">
                      {errors.guardian_occupation}
                    </div>
                  )}
                </div>
                <div className="col-md-3">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    className={`form-control ${errors.date_of_birth ? "is-invalid" : ""}`}
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                  {errors.date_of_birth && (
                    <div className="invalid-feedback">
                      {errors.date_of_birth}
                    </div>
                  )}
                </div>
                <div className="col-md-3">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    name="age"
                    className={`form-control ${errors.age ? "is-invalid" : ""}`}
                    value={formData.age}
                    onChange={handleChange}
                  />
                  {errors.age && (
                    <div className="invalid-feedback">{errors.age}</div>
                  )}
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
                  {errors.sex && (
                    <div className="text-danger small mt-1">{errors.sex}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Educational Qualification
                  </label>
                  <input
                    type="text"
                    name="educational_qualification"
                    className={`form-control ${errors.educational_qualification ? "is-invalid" : ""}`}
                    value={formData.educational_qualification}
                    onChange={handleChange}
                  />
                  {errors.educational_qualification && (
                    <div className="invalid-feedback">
                      {errors.educational_qualification}
                    </div>
                  )}
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
                  {errors.religion && (
                    <div className="text-danger small mt-1">
                      {errors.religion}
                    </div>
                  )}
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
                  {errors.community && (
                    <div className="text-danger small mt-1">
                      {errors.community}
                    </div>
                  )}
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
                  {errors.occupation && (
                    <div className="text-danger small mt-1">
                      {errors.occupation}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Aadhar Card No (12 digits)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="aadhar_no"
                    className={`form-control ${errors.aadhar_no ? "is-invalid" : ""}`}
                    value={formData.aadhar_no}
                    onChange={handleChange}
                  />
                  {errors.aadhar_no && (
                    <div className="invalid-feedback">{errors.aadhar_no}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    If Employed, Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    className={`form-control ${errors.company_name ? "is-invalid" : ""}`}
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                  {errors.company_name && (
                    <div className="invalid-feedback">
                      {errors.company_name}
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label">
                    Address for Communication
                  </label>
                  <textarea
                    name="address"
                    className={`form-control ${errors.address ? "is-invalid" : ""}`}
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                  ></textarea>
                  {errors.address && (
                    <div className="invalid-feedback">{errors.address}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Telephone / Mobile No (10 digits)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="mobile_no"
                    className={`form-control ${errors.mobile_no ? "is-invalid" : ""}`}
                    value={formData.mobile_no}
                    onChange={handleChange}
                  />
                  {errors.mobile_no && (
                    <div className="invalid-feedback">{errors.mobile_no}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">E-mail ID</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                <div className="col-12">
                  <div className="border rounded p-3 bg-light">
                    <span className="badge bg-secondary mb-2">
                      Office Use Only
                    </span>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Total Fee (Rs.)</label>
                        <input
                          type="number"
                          name="total_fee"
                          className="form-control"
                          value={formData.total_fee}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          First Installment Amount (Rs.)
                        </label>
                        <input
                          type="number"
                          name="first_installment_amount"
                          className="form-control"
                          value={formData.first_installment_amount}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-4">
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
                        <label className="form-label">Scheme</label>
                        <input
                          type="text"
                          name="scheme"
                          className="form-control"
                          value={formData.scheme}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Timings</label>
                        <input
                          type="text"
                          name="timings"
                          className="form-control"
                          value={formData.timings}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
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
                {submitting
                  ? isEditMode
                    ? "Updating..."
                    : "Submitting..."
                  : isEditMode
                    ? "Update Admission"
                    : "Save Admission"}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}

export default AdmissionModal;
