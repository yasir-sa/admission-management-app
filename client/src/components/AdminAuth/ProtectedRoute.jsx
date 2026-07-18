import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import API from "../../api/api";

function ProtectedRoute() {
  const [status, setStatus] = useState("checking");
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    API.get("/admin-auth/me")
      .then((response) => {
        if (cancelled) return;
        setAdminInfo(response.data.data);
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
    return <Navigate to="/login" replace />;
  }

  return <Outlet context={adminInfo} />;
}

export default ProtectedRoute;
