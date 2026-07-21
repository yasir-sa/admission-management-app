import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Link } from "react-router-dom";
import API from "../../api/api";

function EntryAttendanceScanner() {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "entry-qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );
    scannerRef.current = scanner;

    const onScanSuccess = async (decodedText) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const response = await API.post(`/entry-attendance/scan/${decodedText}`);
        setToast({
          variant: "success",
          message: response.data.message,
        });
      } catch (err) {
        setToast({
          variant: "danger",
          message: err.response?.data?.message || "Failed to mark entry.",
        });
      } finally {
        setTimeout(() => {
          busyRef.current = false;
        }, 2000);
      }
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      className="container-fluid"
      style={{ maxWidth: "500px", padding: "24px", margin: "0 auto" }}
    >
      {toast && (
        <div
          className="toast-container position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1080 }}
        >
          <div className={`toast show text-white bg-${toast.variant}`}>
            <div className="d-flex">
              <div className="toast-body">{toast.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setToast(null)}
              ></button>
            </div>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Scan Entry Attendance</h4>
            <Link to="/entry-attendance" className="btn btn-sm btn-outline-secondary">
              Back
            </Link>
          </div>
          <p className="text-muted small">
            Scan a student or teacher's QR code to log their entry time — this
            is separate from class attendance.
          </p>
          <div id="entry-qr-reader"></div>
        </div>
      </div>
    </div>
  );
}

export default EntryAttendanceScanner;
