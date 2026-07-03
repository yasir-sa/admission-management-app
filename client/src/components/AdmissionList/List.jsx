import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiTrash2 } from "react-icons/fi";
import API from "../../api/api";
import "./List.css";

function List() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const response = await API.get("/admissions");
      setAdmissions(response.data.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load admission records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const deleteAdmission = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }
    try {
      const response = await API.delete(`/admissions/${id}`);
      setAdmissions((prev) => prev.filter((row) => row.id !== id));
      alert(response.data.message || "Admission deleted successfully");
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to delete admission record."
      );
    }
  };

  if (loading) return <p className="list-status">Loading...</p>;
  if (error) return <p className="list-status list-error">{error}</p>;

  return (
    <div className="admission-list">
      <h2>Admission Records</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Course</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admissions.length === 0 ? (
              <tr>
                <td className="list-status" colSpan={6}>
                  No admission records found.
                </td>
              </tr>
            ) : (
              admissions.map((row) => (
                <tr
                  key={row.id}
                  className="clickable-row"
                  onClick={() => navigate(`/admissions/${row.id}`)}
                >
                  <td>{row.id}</td>
                  <td className="name-cell">{row.applicant_name}</td>
                  <td>{row.course_name}</td>
                  <td>{row.mobile_no}</td>
                  <td>{row.email}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-edit"
                      onClick={() => navigate(`/admissions/${row.id}`)}
                    >
                      <FiEye /> View
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => deleteAdmission(row.id)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default List;
