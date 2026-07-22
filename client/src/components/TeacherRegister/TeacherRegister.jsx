import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
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

// Concept 2 — same section/day mapping as server/utils/sections.js. Batch
// section fixes which days it runs, so the weekly grid is computed here
// rather than fetched.
const SECTION_DAYS = {
  fast_track: [...DAYS_OF_WEEK],
  normal_mwf: ["Monday", "Wednesday", "Friday"],
  normal_tts: ["Tuesday", "Thursday", "Saturday"],
  weekend: ["Saturday"],
};

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
  const { slug: slugParam } = useParams();
  const outletContext = useOutletContext();
  const navigate = useNavigate();
  // Reached either via a personal secret link (/teacher/register/:slug) or
  // via the general Teacher Login page + cookie session
  // (/teacher/dashboard, wrapped in TeacherProtectedRoute which already
  // verified the cookie and hands us the resolved teacher via context).
  const isCookieSession = !slugParam;
  const slug = slugParam || outletContext?.slug;
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
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [batchMarkingId, setBatchMarkingId] = useState(null);
  const [viewGroup, setViewGroup] = useState(null);
  const viewModalRef = useRef(null);
  const [showUnavailableForm, setShowUnavailableForm] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");
  const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [endingId, setEndingId] = useState(null);
  const [endingTopicClassId, setEndingTopicClassId] = useState(null);
  const [topicInputs, setTopicInputs] = useState({});
  const [batchStartingId, setBatchStartingId] = useState(null);
  const [batchEndingId, setBatchEndingId] = useState(null);
  const [batchEndingTopicId, setBatchEndingTopicId] = useState(null);
  const [activeConcept, setActiveConcept] = useState("concept1");
  const [batchTopicInputs, setBatchTopicInputs] = useState({});
  const [expandedSubjectIds, setExpandedSubjectIds] = useState(() => new Set());

  const toggleSubject = (id) => {
    setExpandedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (isCookieSession) {
      // TeacherProtectedRoute already verified the session cookie and
      // resolved who this teacher is — skip the link/OTP steps entirely.
      setPerson({
        teacher_name: outletContext?.teacher_name,
        is_verified: true,
      });
      setStep("dashboard");
      setLoading(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleTeacherLogout = async () => {
    try {
      await API.post("/teacher-auth/logout");
    } catch {
      // Cookie clearing on the server is best-effort; still send them to
      // login either way since staying on the dashboard would be worse.
    }
    navigate("/welcome", { replace: true });
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

  const markBatchPresent = async (admissionId, batchId) => {
    setBatchMarkingId(admissionId);
    try {
      await API.post("/teacher-auth/mark-batch-attendance", {
        slug,
        admission_id: admissionId,
        batch_id: batchId,
      });
      setDashboard((prev) => ({
        ...prev,
        todayBatches: prev.todayBatches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                students: b.students.map((s) =>
                  s.id === admissionId ? { ...s, already_present: true } : s
                ),
              }
            : b
        ),
      }));
      setToast({ variant: "success", message: "Marked present" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to mark attendance.",
      });
    } finally {
      setBatchMarkingId(null);
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

  const startClass = async (slotId, timing) => {
    if (!isWithinClassTime(timing)) {
      window.alert(
        `You can only start this class during its scheduled time (${timing || "not set"}). It is not that time right now.`
      );
      return;
    }
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
    const topic = (topicInputs[slotId] || "").trim();
    if (!topic) {
      setToast({
        variant: "danger",
        message: "Please enter the topic covered today before ending the class.",
      });
      return;
    }
    setEndingId(slotId);
    try {
      const response = await API.post("/teacher-auth/end-class", {
        slug,
        weekly_schedule_slot_id: slotId,
        topic_covered: topic,
      });
      setDashboard((prev) => ({
        ...prev,
        todayClasses: prev.todayClasses.map((cls) =>
          cls.id === slotId
            ? {
                ...cls,
                ended_at: response.data.data.ended_at,
                topic_covered: response.data.data.topic_covered,
              }
            : cls
        ),
      }));
      setEndingTopicClassId(null);
      setTopicInputs((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
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

  const startBatch = async (batchId) => {
    setBatchStartingId(batchId);
    try {
      const response = await API.post("/teacher-auth/start-batch", {
        slug,
        batch_id: batchId,
      });
      setDashboard((prev) => ({
        ...prev,
        todayBatches: prev.todayBatches.map((b) =>
          b.id === batchId
            ? { ...b, started_at: response.data.data.started_at }
            : b
        ),
      }));
      setToast({ variant: "success", message: "Class started" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to start class.",
      });
    } finally {
      setBatchStartingId(null);
    }
  };

  const endBatch = async (batchId) => {
    const topic = (batchTopicInputs[batchId] || "").trim();
    if (!topic) {
      setToast({
        variant: "danger",
        message: "Please enter the topic covered today before ending the class.",
      });
      return;
    }
    setBatchEndingId(batchId);
    try {
      const response = await API.post("/teacher-auth/end-batch", {
        slug,
        batch_id: batchId,
        topic_covered: topic,
      });
      setDashboard((prev) => ({
        ...prev,
        todayBatches: prev.todayBatches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                ended_at: response.data.data.ended_at,
                topic_covered: response.data.data.topic_covered,
              }
            : b
        ),
      }));
      setBatchEndingTopicId(null);
      setBatchTopicInputs((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
      setToast({ variant: "success", message: "Class ended" });
    } catch (err) {
      setToast({
        variant: "danger",
        message: err.response?.data?.message || "Failed to end class.",
      });
    } finally {
      setBatchEndingId(null);
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
        <div
          className="container-fluid d-flex justify-content-between align-items-start"
          style={{ maxWidth: "900px" }}
        >
          <div>
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
          {isCookieSession && (
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={handleTeacherLogout}
            >
              Logout
            </button>
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

              <div className="btn-group mb-4" role="group">
                <button
                  type="button"
                  className={`btn ${activeConcept === "concept1" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setActiveConcept("concept1")}
                >
                  Concept 1
                </button>
                <button
                  type="button"
                  className={`btn ${activeConcept === "concept2" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setActiveConcept("concept2")}
                >
                  Concept 2
                </button>
              </div>

              {activeConcept === "concept1" && (
              <>
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
                                      onClick={() =>
                                        startClass(cls.id, cls.timing)
                                      }
                                    >
                                      {startingId === cls.id
                                        ? "Starting..."
                                        : "Start Class"}
                                    </button>
                                  )}
                                  {cls.started_at &&
                                    !cls.ended_at &&
                                    endingTopicClassId !== cls.id && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() =>
                                          setEndingTopicClassId(cls.id)
                                        }
                                      >
                                        End Class
                                      </button>
                                    )}
                                </div>
                              )}
                              {cls.started_at &&
                                !cls.ended_at &&
                                endingTopicClassId === cls.id && (
                                  <div className="mt-2 d-flex gap-2 flex-wrap align-items-start">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      style={{ maxWidth: "280px" }}
                                      placeholder="Topic covered today (required)"
                                      value={topicInputs[cls.id] || ""}
                                      onChange={(e) =>
                                        setTopicInputs((prev) => ({
                                          ...prev,
                                          [cls.id]: e.target.value,
                                        }))
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      disabled={endingId === cls.id}
                                      onClick={() => endClass(cls.id)}
                                    >
                                      {endingId === cls.id
                                        ? "Ending..."
                                        : "Confirm End Class"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => {
                                        setEndingTopicClassId(null);
                                        setTopicInputs((prev) => {
                                          const next = { ...prev };
                                          delete next[cls.id];
                                          return next;
                                        });
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              {cls.topic_covered && (
                                <div className="text-muted small mt-1">
                                  <i className="bi bi-journal-text me-1"></i>
                                  Topic covered: {cls.topic_covered}
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
                  <h5 className="mb-3">Topics Covered Today</h5>
                  {dashboard.todayClasses.filter((c) => c.topic_covered)
                    .length === 0 ? (
                    <div className="text-muted small">
                      No topics recorded yet — they'll show here once you end
                      a class.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Group</th>
                            <th>Topic</th>
                            <th>In Time</th>
                            <th>Out Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.todayClasses
                            .filter((c) => c.topic_covered)
                            .map((c) => (
                              <tr key={c.id}>
                                <td>{c.group_name}</td>
                                <td>{c.topic_covered}</td>
                                <td>
                                  {c.started_at
                                    ? new Date(
                                        c.started_at
                                      ).toLocaleTimeString("en-IN")
                                    : "-"}
                                </td>
                                <td>
                                  {c.ended_at
                                    ? new Date(c.ended_at).toLocaleTimeString(
                                        "en-IN"
                                      )
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
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

              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="mb-3">My Courses — Syllabus</h5>
                  {(dashboard.courseSyllabus || []).length === 0 ? (
                    <div className="text-muted small">
                      No courses assigned yet.
                    </div>
                  ) : (
                    dashboard.courseSyllabus.map((course) => (
                      <div key={course.course_id} className="mb-3">
                        <div className="fw-bold mb-2">
                          <span className="badge bg-primary me-2">
                            {course.course_name}
                          </span>
                        </div>
                        {course.subjects.length === 0 ? (
                          <div className="text-muted small mb-2">
                            No subjects mapped to this course yet.
                          </div>
                        ) : (
                          course.subjects.map((subject) => (
                            <div
                              key={subject.id}
                              className="border rounded p-2 mb-2"
                            >
                              <div
                                role="button"
                                className="d-flex justify-content-between align-items-center"
                                onClick={() => toggleSubject(subject.id)}
                              >
                                <div>
                                  <span className="fw-semibold">
                                    {subject.subject_name}
                                  </span>
                                  {subject.parent_name && (
                                    <span className="text-muted small ms-2">
                                      (under {subject.parent_name})
                                    </span>
                                  )}
                                </div>
                                <i
                                  className={`bi ${expandedSubjectIds.has(subject.id) ? "bi-chevron-up" : "bi-chevron-down"} text-muted`}
                                ></i>
                              </div>
                              {expandedSubjectIds.has(subject.id) && (
                                <div className="mt-2">
                                  <div
                                    className="text-muted small mb-2"
                                    style={{ whiteSpace: "pre-line" }}
                                  >
                                    {subject.syllabus ||
                                      subject.description ||
                                      "No syllabus added for this subject yet."}
                                  </div>
                                  {subject.subSubjects.length > 0 && (
                                    <div className="ps-3 border-start">
                                      {subject.subSubjects.map((sub) => (
                                        <div key={sub.id} className="mb-2">
                                          <div
                                            role="button"
                                            className="d-flex justify-content-between align-items-center"
                                            onClick={() =>
                                              toggleSubject(sub.id)
                                            }
                                          >
                                            <span className="fw-semibold small">
                                              {sub.subject_name}
                                            </span>
                                            <i
                                              className={`bi ${expandedSubjectIds.has(sub.id) ? "bi-chevron-up" : "bi-chevron-down"} text-muted`}
                                            ></i>
                                          </div>
                                          {expandedSubjectIds.has(sub.id) && (
                                            <div
                                              className="text-muted small mt-1"
                                              style={{
                                                whiteSpace: "pre-line",
                                              }}
                                            >
                                              {sub.syllabus ||
                                                sub.description ||
                                                "No syllabus added for this sub-subject yet."}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              </>
              )}

              {activeConcept === "concept2" && (
              <>
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

              {dashboard.todayBatches?.length > 0 && (
                <div className="card shadow-sm mb-4">
                  <div className="card-body">
                    <h5 className="mb-3">My Batches Today</h5>
                    {dashboard.todayBatches.map((b) => {
                      const isBatchExpanded = expandedBatchId === b.id;
                      return (
                      <div key={b.id} className="border rounded p-3 mb-2">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div>
                            <strong>{b.batch_name}</strong>
                            <span className="text-muted small ms-2">
                              {b.subject_name}
                            </span>
                            <span className="badge bg-info text-dark ms-2">
                              {b.section_label}
                            </span>
                            {b.is_substitute && (
                              <span className="badge bg-warning text-dark ms-2">
                                Substitute Class
                              </span>
                            )}
                            <div className="text-muted small">
                              <i className="bi bi-clock me-1"></i>
                              {b.timing || "No timing set"}
                              {b.num_days && ` — ${b.num_days} days`}
                            </div>
                            {!b.covered_by && (
                              <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                                {b.started_at && (
                                  <span className="badge bg-success">
                                    <i className="bi bi-play-circle me-1"></i>
                                    Started at{" "}
                                    {new Date(b.started_at).toLocaleTimeString("en-IN")}
                                  </span>
                                )}
                                {b.ended_at && (
                                  <span className="badge bg-secondary">
                                    <i className="bi bi-stop-circle me-1"></i>
                                    Ended at{" "}
                                    {new Date(b.ended_at).toLocaleTimeString("en-IN")}
                                  </span>
                                )}
                                {!b.started_at && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    disabled={batchStartingId === b.id}
                                    onClick={() => startBatch(b.id)}
                                  >
                                    {batchStartingId === b.id ? "Starting..." : "Start Class"}
                                  </button>
                                )}
                                {b.started_at &&
                                  !b.ended_at &&
                                  batchEndingTopicId !== b.id && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => setBatchEndingTopicId(b.id)}
                                    >
                                      End Class
                                    </button>
                                  )}
                              </div>
                            )}
                            {b.started_at &&
                              !b.ended_at &&
                              batchEndingTopicId === b.id && (
                                <div className="mt-2 d-flex gap-2 flex-wrap align-items-start">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    style={{ maxWidth: "280px" }}
                                    placeholder="Topic covered today (required)"
                                    value={batchTopicInputs[b.id] || ""}
                                    onChange={(e) =>
                                      setBatchTopicInputs((prev) => ({
                                        ...prev,
                                        [b.id]: e.target.value,
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    disabled={batchEndingId === b.id}
                                    onClick={() => endBatch(b.id)}
                                  >
                                    {batchEndingId === b.id ? "Ending..." : "Confirm End Class"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                      setBatchEndingTopicId(null);
                                      setBatchTopicInputs((prev) => {
                                        const next = { ...prev };
                                        delete next[b.id];
                                        return next;
                                      });
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            {b.topic_covered && (
                              <div className="text-muted small mt-1">
                                <i className="bi bi-journal-text me-1"></i>
                                Topic covered: {b.topic_covered}
                              </div>
                            )}
                          </div>
                          {b.covered_by ? (
                            <span className="badge bg-secondary">
                              Covered by {b.covered_by} today
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setExpandedBatchId(isBatchExpanded ? null : b.id)}
                            >
                              {isBatchExpanded ? "Hide Students" : "Mark Attendance"}
                            </button>
                          )}
                        </div>
                        {isBatchExpanded && (
                          <div className="mt-3">
                            {(b.students || []).length === 0 ? (
                              <div className="text-muted small">
                                No students in this batch yet.
                              </div>
                            ) : (
                              <div className="row g-2">
                                {b.students.map((s) => (
                                  <div className="col-md-6" key={s.id}>
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
                                          disabled={batchMarkingId === s.id}
                                          onClick={() => markBatchPresent(s.id, b.id)}
                                        >
                                          {batchMarkingId === s.id ? "..." : "Mark Present"}
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
                    })}
                  </div>
                </div>
              )}

              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="mb-3">
                    My Weekly Batch Schedule
                  </h5>
                  {(dashboard.myBatches || []).length === 0 ? (
                    <div className="text-muted small">
                      No batches assigned yet.
                    </div>
                  ) : (
                    <div className="row g-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const dayBatches = (dashboard.myBatches || []).filter(
                          (b) => (SECTION_DAYS[b.section] || []).includes(day)
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
                                  <span className="badge bg-primary">Today</span>
                                )}
                              </div>
                              {dayBatches.length === 0 ? (
                                <div className="text-muted small mt-1">
                                  No class
                                </div>
                              ) : (
                                dayBatches.map((b) => (
                                  <div key={b.id} className="small mt-1">
                                    <div className="fw-semibold">
                                      {b.batch_name}
                                    </div>
                                    <div className="text-muted">
                                      {b.timing || "No timing"}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
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
