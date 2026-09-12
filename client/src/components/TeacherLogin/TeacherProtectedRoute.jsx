import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import API from "../../api/api";
import { useArrowKeyFormNav } from "../../utils/arrowKeyFormNav";

function TeacherProtectedRoute() {
  const [status, setStatus] = useState("checking");
  const [teacherInfo, setTeacherInfo] = useState(null);
  const containerRef = useRef(null);
  useArrowKeyFormNav(containerRef);

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

  if (status === "unauthed") {
    return <Navigate to="/welcome" replace />;
  }

  // Always mounted (even while "checking") so containerRef.current exists
  // by the time useArrowKeyFormNav's effect runs — that effect only ever
  // runs once, keyed on the stable ref object itself, so if this div
  // weren't in the tree yet on that first run, it would never retry once
  // the real content mounted later.
  return (
    <div ref={containerRef}>
      {status === "checking" ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <Outlet context={teacherInfo} />
      )}
    </div>
  );
}

export default TeacherProtectedRoute;
