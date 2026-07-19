import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";

function Landing() {
  const [adminSession, setAdminSession] = useState(null);
  const [teacherSession, setTeacherSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      API.get("/admin-auth/me"),
      API.get("/teacher-auth/me"),
    ]).then(([adminResult, teacherResult]) => {
      if (adminResult.status === "fulfilled") {
        setAdminSession(adminResult.value.data.data);
      }
      if (teacherResult.status === "fulfilled") {
        setTeacherSession(teacherResult.value.data.data);
      }
      setChecking(false);
    });
  }, []);

  return (
    <div
      className="container-fluid d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", padding: "24px" }}
    >
      <div className="card shadow-sm w-100" style={{ maxWidth: "440px" }}>
        <div className="card-body text-center">
          <h3 className="mb-4">Course Admission</h3>

          {checking ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <>
              {(adminSession || teacherSession) && (
                <div className="mb-4 pb-3 border-bottom">
                  <div className="text-muted small mb-2">
                    You're already logged in
                  </div>
                  {adminSession && (
                    <Link to="/" className="btn btn-success w-100 mb-2">
                      Go to Admin Dashboard
                      {adminSession.name ? ` — ${adminSession.name}` : ""}
                    </Link>
                  )}
                  {teacherSession && (
                    <Link
                      to="/teacher/dashboard"
                      className="btn btn-success w-100"
                    >
                      Go to Teacher Dashboard
                      {teacherSession.teacher_name
                        ? ` — ${teacherSession.teacher_name}`
                        : ""}
                    </Link>
                  )}
                </div>
              )}

              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-primary flex-fill">
                  Admin Login
                </Link>
                <Link
                  to="/teacher-login"
                  className="btn btn-outline-primary flex-fill"
                >
                  Teacher Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Landing;
