import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import API from "../../api/api";

function TeacherProtectedRoute() {
  const [status, setStatus] = useState("checking");
  const [teacherInfo, setTeacherInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    API.get("/teacher-auth/me")
      .then((response) => {
        if (cancelled) return;
        setTeacherInfo(response.data.data);
        setStatus("authed");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthed") {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet context={teacherInfo} />;
}

export default TeacherProtectedRoute;
