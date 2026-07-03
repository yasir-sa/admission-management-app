import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiSave, FiX } from "react-icons/fi";
import API from "../../api/api";
import "./Detail.css";

const SELECT_OPTIONS = {
  sex: ["M", "F"],
  religion: ["Hindu", "Christian", "Muslim", "Others"],
  community: ["OC", "BC", "MBC", "ST/SC"],
  occupation: ["Student", "House Wife", "Employed", "Un-employed", "Business"],
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FIELDS = [
  { key: "comn_enrol_no", label: "Enrol No", type: "text" },
  { key: "course_name", label: "Course Name", type: "text" },
  { key: "session", label: "Session", type: "text" },
  { key: "applicant_name", label: "Name", type: "text" },
  { key: "father_husband_name", label: "Father's / Husband's Name", type: "text" },
  { key: "guardian_occupation", label: "Guardian Occupation", type: "text" },
  { key: "date_of_birth", label: "Date of Birth", type: "date" },
  { key: "age", label: "Age", type: "number" },
  { key: "sex", label: "Sex", type: "select" },
  { key: "educational_qualification", label: "Qualification", type: "text" },
  { key: "religion", label: "Religion", type: "select" },
  { key: "community", label: "Community", type: "select" },
  { key: "occupation", label: "Occupation", type: "select" },
  { key: "aadhar_no", label: "Aadhar No", type: "text" },
  { key: "company_name", label: "Company Name", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "mobile_no", label: "Mobile No", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "total_fee", label: "Total Fee (Rs.)", type: "number" },
  {
    key: "first_installment_amount",
    label: "First Installment (Rs.)",
    type: "number",
  },
  { key: "bill_no", label: "Bill No", type: "text" },
  { key: "scheme", label: "Scheme", type: "text" },
  { key: "timings", label: "Timings", type: "text" },
];

function Detail() {
  const { id } = useParams();

  const [admission, setAdmission] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/admissions/${id}`);
      setAdmission(response.data.data);
      setPayments(response.data.data.FeePayments || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load admission details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEdit = () => {
    setEditData({ ...admission });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData({});
  };

  const handleChange = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const response = await API.put(`/admissions/${id}`, editData);
      setAdmission(response.data.data);
      alert(response.data.message || "Admission updated successfully");
      setEditing(false);
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to update admission record."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="detail-status">Loading...</p>;
  if (error) return <p className="detail-status detail-error">{error}</p>;
  if (!admission) return null;

  return (
    <div className="admission-detail">
      <div className="detail-header">
        <Link to="/admissions" className="back-link">
          <FiArrowLeft /> Back to Admission List
        </Link>
        {!editing && (
          <button className="btn-edit" onClick={startEdit}>
            <FiEdit2 /> Edit
          </button>
        )}
      </div>

      <h2>Admission Details</h2>
      <p className="submitted-on">
        Submitted on {formatDateTime(admission.created_at)}
      </p>
      <div className="detail-grid">
        {FIELDS.map((field) => (
          <div className="detail-field" key={field.key}>
            <label>{field.label}</label>
            {editing ? (
              field.type === "select" ? (
                <select
                  value={editData[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                >
                  <option value="">Select</option>
                  {SELECT_OPTIONS[field.key].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={editData[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )
            ) : (
              <p>{admission[field.key] ?? "-"}</p>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="detail-actions">
          <button className="btn-save" disabled={saving} onClick={saveEdit}>
            <FiSave /> {saving ? "Saving..." : "Save"}
          </button>
          <button className="btn-cancel" onClick={cancelEdit}>
            <FiX /> Cancel
          </button>
        </div>
      )}

      <h2>Fee Payment History</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Year</th>
              <th>Amount Paid</th>
              <th>Paid Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td className="detail-status" colSpan={5}>
                  No payment records found.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.month}</td>
                  <td>{p.year}</td>
                  <td>{p.amount_paid ?? "-"}</td>
                  <td>{p.paid_date ?? "-"}</td>
                  <td>{p.status ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Detail;
