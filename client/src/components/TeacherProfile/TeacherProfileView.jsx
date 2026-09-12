import { useEffect, useState } from "react";
import API from "../../api/api";

function TeacherProfileView() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/teacher-auth/me")
      .then((response) => setTeacher(response.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted small">Loading...</div>;
  if (!teacher) return <div className="text-danger small">Failed to load profile.</div>;

  const rows = [
    { label: "Name", value: teacher.teacher_name },
    { label: "Email", value: teacher.email },
    { label: "Mobile No", value: teacher.mobile_no },
    { label: "Qualification", value: teacher.qualification },
    {
      label: "Joining Date",
      value: teacher.joining_date
        ? new Date(teacher.joining_date).toLocaleDateString("en-IN")
        : null,
    },
    { label: "Courses", value: teacher.courses?.length ? teacher.courses.join(", ") : null },
  ];

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="row g-3">
          {rows.map((r) => (
            <div className="col-md-6" key={r.label}>
              <div className="text-muted small text-uppercase fw-bold">{r.label}</div>
              <div>{r.value || "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeacherProfileView;
