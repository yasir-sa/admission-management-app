import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Modal } from "bootstrap";
import { QRCodeSVG } from "qrcode.react";
import API from "../../api/api";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const parseTimePart = (str) => {
  const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  return {
    hour: parseInt(match[1], 10),
    minute: match[2] ? parseInt(match[2], 10) : 0,
    ampm: match[3] ? match[3].toUpperCase() : null,
  };
};

const parseTimeRange = (timing) => {
  if (!timing) return null;
  const parts = timing.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const start = parseTimePart(parts[0]);
  const end = parseTimePart(parts[1]);
  if (!start || !end) return null;

  if (!start.ampm && end.ampm) start.ampm = end.ampm;
  if (!end.ampm && start.ampm) end.ampm = start.ampm;

  const to24 = (t) => {
    let h = t.hour;
    if (t.ampm === "PM" && h !== 12) h += 12;
    if (t.ampm === "AM" && h === 12) h = 0;
    return h * 60 + t.minute;
  };

  return { startMinutes: to24(start), endMinutes: to24(end) };
};

const isWithinClassTime = (timing) => {
  const range = parseTimeRange(timing);
  if (!range) return true;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= range.startMinutes && nowMinutes <= range.endMinutes;
};

function TeacherRegister() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [person, setPerson] = useState(null);
  const [step, setStep] = useState("intro");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [viewGroup, setViewGroup] = useState(null);
  const viewModalRef = useRef(null);
  const [showUnavailableForm, setShowUnavailableForm] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");
  const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [endingId, setEndingId] = useState(null);

  useEffect(() => {
    const lookup = async () => {
      try {
        const response = await API.get(`/teacher-auth/lookup/${slug}`);
        setPerson(response.data.data);
        if (response.data.data.is_verified) {
          setStep("dashboard");
        }
      } catch (err) {
        setLinkError(err.response?.data?.message || "This link is not valid.");
      } finally {
        setLoading(false);
      }
    };
    lookup();
  }, [slug]);

  useEffect(() => {
    if (step !== "dashboard") return;
    const loadDashboard = async () => {
      setDashboardLoading(true);
      try {
        const response = await API.get(`/teacher-auth/dashboard/${slug}`);
        setDashboard(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard.");
      } finally {
        setDashboardLoading(false);
      }
    };
    loadDashboard();
  }, [step, slug]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const forceCleanup = () => {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    };
    const modalEl = viewModalRef.current;
    if (!modalEl) return;
    modalEl.addEventListener("hidden.bs.modal", forceCleanup);
    return () => modalEl.removeEventListener("hidden.bs.modal", forceCleanup);
  }, [dashboard]);

  const requestOtp = async () => {
    setError("");
    setSubmitting(true);
    try {
      const response = await API.post("/teacher-auth/request-otp", { slug });
      setMaskedEmail(response.data.message);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await API.post("/teacher-auth/verify-otp", { slug, otp });
      setStep("dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAttendanceClick = (cls, isExpanded) => {
    if (!isExpanded && !isWithinClassTime(cls.timing)) {
      window.alert(
        `You can only mark attendance during the class time (${cls.timing || "not set"}). It is not that time right now.`
      );
      return;
    }
    setExpandedClassId(isExpanded ? null : cls.id);
  };

  const openViewGroupModal = (group) => {
    setViewGroup(group);
    Modal.getOrCreateInstance(viewModalRef.current).show();
  };

  const markPresent = async (admissionId, slotId) => {
    setMarkingId(admissionId);
    try {
      await API.post("/teacher-auth/mark-attendance", {
        slug,
        admission_id: admissionId,
        weekly_schedule_slot_id: slotId,
      });
      setDashboard((prev) => ({
        ...prev,
        todayClasses: prev.todayClasses.map((cls) =>
          cls.id === slotId
            ? {
                ...cls,
                students: cls.students.map((s) =>
                  s.id === admissionId ? { ...s, already_present: true } : s
                ),
              }
            : cls
        ),
      }));
      setToast({ variant: "success", message: "Marked present" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to mark attendance.",
      });
    } finally {
      setMarkingId(null);
    }
  };

  const markUnavailableToday = async () => {
    if (!unavailableReason.trim()) {
      setToast({ variant: "danger", message: "Please enter a reason." });
      return;
    }
    setAvailabilitySubmitting(true);
    try {
      await API.post("/teacher-auth/mark-unavailable", {
        slug,
        reason: unavailableReason.trim(),
      });
      setShowUnavailableForm(false);
      setUnavailableReason("");
      const response = await API.get(`/teacher-auth/dashboard/${slug}`);
      setDashboard(response.data.data);
      setToast({ variant: "success", message: "Marked as not available for today" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to update.",
      });
    } finally {
      setAvailabilitySubmitting(false);
    }
  };

  const markAvailableToday = async () => {
    setAvailabilitySubmitting(true);
    try {
      await API.post("/teacher-auth/mark-available", { slug });
      const response = await API.get(`/teacher-auth/dashboard/${slug}`);
      setDashboard(response.data.data);
      setToast({ variant: "success", message: "Marked as available again" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to update.",
      });
    } finally {
      setAvailabilitySubmitting(false);
    }
  };

  const startClass = async (slotId) => {
    setStartingId(slotId);
    try {
      const response = await API.post("/teacher-auth/start-class", {
        slug,
        weekly_schedule_slot_id: slotId,
      });
      setDashboard((prev) => ({
        ...prev,
        todayClasses: prev.todayClasses.map((cls) =>
          cls.id === slotId
            ? { ...cls, started_at: response.data.data.started_at }
            : cls
        ),
      }));
      setToast({ variant: "success", message: "Class started" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to start class.",
      });
    } finally {
      setStartingId(null);
    }
  };

  const endClass = async (slotId) => {
    setEndingId(slotId);
    try {
      const response = await API.post("/teacher-auth/end-class", {
        slug,
        weekly_schedule_slot_id: slotId,
      });
      setDashboard((prev) => ({
        ...prev,
        todayClasses: prev.todayClasses.map((cls) =>
          cls.id === slotId
            ? { ...cls, ended_at: response.data.data.ended_at }
            : cls
        ),
      }));
      setToast({ variant: "success", message: "Class ended" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to end class.",
      });
    } finally {
      setEndingId(null);
    }
  };

  if (loading)
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );

  if (linkError)
    return (
      <div
        className="container-fluid d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", padding: "24px" }}
      >
        <div className="card shadow-sm" style={{ maxWidth: "420px" }}>
          <div className="card-body text-center text-danger">
            {linkError}
          </div>
        </div>
      </div>
    );

  if (step !== "dashboard") {
    return (
      <div
        className="container-fluid d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", padding: "24px" }}
      >
        <div className="card shadow-sm w-100" style={{ maxWidth: "420px" }}>
          <div className="card-body text-center">
            {person && (
              <>
                <h4 className="mb-3">Hi, {person.teacher_name}</h4>

                {step === "intro" && (
                  <>
                    <p className="text-muted small">
                      Click below to receive an OTP on your registered email
                      {person.masked_email ? ` (${person.masked_email})` : ""}
                      .
                    </p>
                    {error && (
                      <div className="text-danger small mb-3">{error}</div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={requestOtp}
                      disabled={submitting}
                    >
                      {submitting ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </>
                )}

                {step === "otp" && (
                  <form onSubmit={verifyOtp} className="text-start">
                    <p className="text-muted small text-center">
                      {maskedEmail}
                    </p>
                    <label className="form-label">Enter OTP</label>
                    <input
                      type="text"
                      className="form-control mb-3"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit OTP"
                      required
                    />
                    {error && (
                      <div className="text-danger small mb-3">{error}</div>
                    )}
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={submitting}
                    >
                      {submitting ? "Verifying..." : "Verify OTP"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9" }}>
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

      <div className="bg-primary text-white py-4 px-3 mb-4 shadow-sm">
        <div className="container-fluid" style={{ maxWidth: "900px" }}>
          <h3 className="mb-1">{person?.teacher_name}</h3>
          {dashboard?.teacher?.qualification && (
            <div className="small opacity-75">
              {dashboard.teacher.qualification}
            </div>
          )}
          {dashboard?.teacher?.courses?.length > 0 && (
            <div className="small opacity-75">
              Courses: {dashboard.teacher.courses.join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="container-fluid" style={{ maxWidth: "900px" }}>
        {dashboardLoading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : (
          dashboard && (
            <>
              <div className="card shadow-sm mb-4">
                <div className="card-body text-center">
                  <h5 className="mb-3">My QR Code</h5>
                  <div className="d-flex justify-content-center mb-2">
                    <QRCodeSVG value={slug} size={180} />
                  </div>
                  <div className="text-muted small">
                    Show this QR code to the admin for attendance.
                  </div>
                </div>
              </div>

              {dashboard.holiday && (
                <div className="alert alert-warning mb-4">
                  <i className="bi bi-calendar-x me-2"></i>
                  <strong>Today is a Holiday</strong>
                  {dashboard.holiday.description &&
                    ` — ${dashboard.holiday.description}`}
                  . No classes today.
                </div>
              )}

              {dashboard.upcomingHolidays?.length > 0 && (
                <div className="alert alert-info mb-4">
                  <i className="bi bi-calendar-event me-2"></i>
                  <strong>Upcoming Holiday{dashboard.upcomingHolidays.length > 1 ? "s" : ""}:</strong>{" "}
                  {dashboard.upcomingHolidays
                    .map(
                      (h) =>
                        `${h.date}${h.description ? ` — ${h.description}` : ""}`
                    )
                    .join(", ")}
                </div>
              )}

              {!dashboard.holiday && (
                <div className="card shadow-sm mb-4">
                  <div className="card-body">
                    {dashboard.my_availability ? (
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="text-danger small">
                          <i className="bi bi-person-x me-1"></i>
                          You marked yourself <strong>not available</strong>{" "}
                          today — {dashboard.my_availability.reason}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={markAvailableToday}
                          disabled={availabilitySubmitting}
                        >
                          I'm available after all
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="small text-muted">
                            Can't come to class today?
                          </div>
                          {!showUnavailableForm && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setShowUnavailableForm(true)}
                            >
                              Mark Not Available Today
                            </button>
                          )}
                        </div>
                        {showUnavailableForm && (
                          <div className="mt-2 d-flex gap-2 flex-wrap">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              style={{ maxWidth: "300px" }}
                              placeholder="Reason (required)"
                              value={unavailableReason}
                              onChange={(e) =>
                                setUnavailableReason(e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={markUnavailableToday}
                              disabled={availabilitySubmitting}
                            >
                              Submit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setShowUnavailableForm(false);
                                setUnavailableReason("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Today's Classes</h5>
                    <span className="badge bg-primary">{dashboard.today}</span>
                  </div>
                  {dashboard.todayClasses.length === 0 ? (
                    <div className="text-muted small">
                      {dashboard.holiday
                        ? "No classes today — it's a holiday."
                        : "No classes scheduled for you today."}
                    </div>
                  ) : (
                    dashboard.todayClasses.map((cls) => {
                      const isExpanded = expandedClassId === cls.id;
                      return (
                        <div key={cls.id} className="border rounded p-3 mb-2">
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                              <strong>{cls.group_name}</strong>
                              <span className="text-muted small ms-2">
                                {cls.course_name}
                              </span>
                              {cls.is_substitute && (
                                <span className="badge bg-warning text-dark ms-2">
                                  Substitute Class
                                </span>
                              )}
                              <div className="text-muted small">
                                <i className="bi bi-clock me-1"></i>
                                {cls.timing || "No timing set"}
                              </div>
                              {!cls.covered_by && (
                                <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                                  {cls.started_at && (
                                    <span className="badge bg-success">
                                      <i className="bi bi-play-circle me-1"></i>
                                      Started at{" "}
                                      {new Date(
                                        cls.started_at
                                      ).toLocaleTimeString("en-IN")}
                                    </span>
                                  )}
                                  {cls.ended_at && (
                                    <span className="badge bg-secondary">
                                      <i className="bi bi-stop-circle me-1"></i>
                                      Ended at{" "}
                                      {new Date(
                                        cls.ended_at
                                      ).toLocaleTimeString("en-IN")}
                                    </span>
                                  )}
                                  {!cls.started_at && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-success"
                                      disabled={startingId === cls.id}
                                      onClick={() => startClass(cls.id)}
                                    >
                                      {startingId === cls.id
                                        ? "Starting..."
                                        : "Start Class"}
                                    </button>
                                  )}
                                  {cls.started_at && !cls.ended_at && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      disabled={endingId === cls.id}
                                      onClick={() => endClass(cls.id)}
                                    >
                                      {endingId === cls.id
                                        ? "Ending..."
                                        : "End Class"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            {cls.covered_by ? (
                              <span className="badge bg-secondary">
                                Covered by {cls.covered_by} today
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() =>
                                  handleMarkAttendanceClick(cls, isExpanded)
                                }
                              >
                                {isExpanded ? "Hide Students" : "Mark Attendance"}
                              </button>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="mt-3">
                              {cls.students.length === 0 ? (
                                <div className="text-muted small">
                                  No students in this group yet.
                                </div>
                              ) : (
                                <div className="row g-2">
                                  {cls.students.map((s) => (
                                    <div
                                      className="col-md-6"
                                      key={s.id}
                                    >
                                      <div className="d-flex justify-content-between align-items-center border rounded p-2">
                                        <div>
                                          <div className="fw-semibold small">
                                            {s.applicant_name}
                                          </div>
                                          {s.comn_enrol_no && (
                                            <div className="text-muted small">
                                              {s.comn_enrol_no}
                                            </div>
                                          )}
                                        </div>
                                        {s.already_present ? (
                                          <span className="badge bg-success">
                                            <i className="bi bi-check-lg me-1"></i>
                                            Present
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-success"
                                            disabled={markingId === s.id}
                                            onClick={() =>
                                              markPresent(s.id, cls.id)
                                            }
                                          >
                                            {markingId === s.id
                                              ? "..."
                                              : "Mark Present"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="mb-3">
                    My Weekly Schedule
                    {dashboard.weeklyScheduleName && (
                      <span className="text-muted small ms-2">
                        ({dashboard.weeklyScheduleName})
                      </span>
                    )}
                  </h5>
                  <div className="row g-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const daySlots = dashboard.allSlots.filter(
                        (s) => s.day_of_week === day
                      );
                      const isToday = day === dashboard.today;
                      return (
                        <div className="col-6 col-md-3" key={day}>
                          <div
                            className={`border rounded p-2 h-100 ${isToday ? "border-primary border-2 bg-light" : ""}`}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <strong className="small">{day}</strong>
                              {isToday && (
                                <span className="badge bg-primary">
                                  Today
                                </span>
                              )}
                            </div>
                            {daySlots.length === 0 ? (
                              <div className="text-muted small mt-1">
                                No class
                              </div>
                            ) : (
                              daySlots.map((s) => (
                                <div key={s.id} className="small mt-1">
                                  <div className="fw-semibold">
                                    {s.group_name}
                                  </div>
                                  <div className="text-muted">
                                    {s.timing || "No timing"}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="mb-3">My Groups</h5>
                  {dashboard.groups.length === 0 ? (
                    <div className="text-muted small">
                      No groups assigned yet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Group Name</th>
                            <th>Course</th>
                            <th>Students</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.groups.map((g) => (
                            <tr key={g.id}>
                              <td>{g.group_name}</td>
                              <td>{g.course_name}</td>
                              <td>
                                <span className="badge bg-info text-dark">
                                  {g.students.length}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => openViewGroupModal(g)}
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  View Students
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        )}
      </div>

      <div
        className="modal fade"
        id="viewGroupStudentsModal"
        tabIndex="-1"
        ref={viewModalRef}
      >
        <div className="modal-dialog modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {viewGroup?.group_name} — Students
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              {viewGroup && (
                <>
                  <div className="text-muted small mb-3">
                    Course: {viewGroup.course_name}
                  </div>
                  {viewGroup.students.length === 0 ? (
                    <div className="text-muted small">
                      No students in this group yet.
                    </div>
                  ) : (
                    <ol className="mb-0 ps-3">
                      {viewGroup.students.map((s) => (
                        <li key={s.id} className="mb-1">
                          {s.applicant_name}
                          {s.comn_enrol_no && (
                            <span className="text-muted">
                              {" "}
                              — {s.comn_enrol_no}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherRegister;
