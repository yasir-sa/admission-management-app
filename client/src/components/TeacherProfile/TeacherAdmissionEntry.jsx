import { useState } from "react";
import { Modal } from "bootstrap";
import AdmissionModal from "../AdmissionModal/AdmissionModal";

// Reuses the admin's own Add Admission modal exactly — same fields, same
// layout — via AdmissionModal's teacherMode prop (skips the /courses
// dropdown and Student App auto-sync, which need admin auth) and a
// teacher-scoped endpoint. Always create-only: editingRecord is never set.
function TeacherAdmissionEntry() {
  const [toast, setToast] = useState(null);

  const openModal = () => {
    Modal.getOrCreateInstance(document.getElementById("addAdmissionModal")).show();
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {toast && <div className={`alert alert-${toast.variant} py-2`}>{toast.message}</div>}
        <p className="text-muted small">
          Add a new admission record directly — it's saved the same way an admin's own entry is.
        </p>
        <button type="button" className="btn btn-primary" onClick={openModal}>
          <i className="bi bi-plus-lg me-1"></i> Add Admission
        </button>
      </div>
      <AdmissionModal
        editingRecord={null}
        endpoint="/teacher-auth/entry/admission"
        teacherMode
        onSuccess={() => setToast({ variant: "success", message: "Admission saved successfully." })}
      />
    </div>
  );
}

export default TeacherAdmissionEntry;
