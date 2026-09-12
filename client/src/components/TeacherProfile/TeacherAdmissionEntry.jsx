import Form from "../AdmissionForm/Form";

// Reuses the admin's own Admission Form component unchanged — it's
// already a self-contained create form with no admin-only list fetches —
// just pointed at the teacher-scoped write-only endpoint instead.
function TeacherAdmissionEntry() {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <Form endpoint="/teacher-auth/entry/admission" />
      </div>
    </div>
  );
}

export default TeacherAdmissionEntry;
