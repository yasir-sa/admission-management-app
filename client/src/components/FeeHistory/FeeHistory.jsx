import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import API from "../../api/api";
import "./FeeHistory.css";

function FeeHistory() {
  const { id } = useParams();

  const [applicantName, setApplicantName] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFees = async () => {
      setLoading(true);
      try {
        const response = await API.get(`/admissions/${id}`);
        setApplicantName(response.data.data.applicant_name);
        setPayments(response.data.data.FeePayments || []);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load fee payment history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [id]);

  if (loading) return <p className="fee-status">Loading...</p>;
  if (error) return <p className="fee-status fee-error">{error}</p>;

  return (
    <div className="fee-history">
      <Link to="/" className="back-link">
        <FiArrowLeft /> Back to Admission List
      </Link>

      <h2>Fee Payment History — {applicantName}</h2>

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
                <td className="fee-status" colSpan={5}>
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

export default FeeHistory;
