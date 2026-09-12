import { NavLink, Outlet, useNavigate } from "react-router-dom";

const TABS = [
  { path: "/teacher/profile", label: "Profile", icon: "bi-person", end: true },
  { path: "/teacher/profile/leave-requests", label: "Leave Requests", icon: "bi-envelope-paper" },
  { path: "/teacher/profile/admission-entry", label: "Admission Entry", icon: "bi-person-plus" },
  { path: "/teacher/profile/fees-entry", label: "Fees Entry", icon: "bi-cash-coin" },
  { path: "/teacher/profile/enquiry-entry", label: "Enquiry Entry", icon: "bi-clipboard-plus" },
];

// Hub for everything under the teacher header's "Profile" button — one
// shared sub-nav, each item its own routed page via <Outlet/>. Entry
// pages here are write-only (see teacherAsAdmin.js) — a teacher can add
// an admission/fee/enquiry record directly, but never browse existing ones.
function TeacherProfileLayout() {
  const navigate = useNavigate();

  return (
    <div className="container-fluid" style={{ maxWidth: "900px", padding: "24px" }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">My Profile</h4>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate("/teacher/dashboard")}
        >
          <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
        </button>
      </div>

      <div className="d-flex gap-2 flex-wrap mb-4">
        {TABS.map((t) => (
          <NavLink
            key={t.path}
            to={t.path}
            end={Boolean(t.end)}
            className={({ isActive }) => `btn btn-sm ${isActive ? "btn-primary" : "btn-outline-primary"}`}
          >
            <i className={`bi ${t.icon} me-1`}></i>
            {t.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}

export default TeacherProfileLayout;
