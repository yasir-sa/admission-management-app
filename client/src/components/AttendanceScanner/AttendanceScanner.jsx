import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import API from "../../api/api";

function AttendanceScanner() {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );
    scannerRef.current = scanner;

    const onScanSuccess = async (decodedText) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const response = await API.post(`/attendance/scan/${decodedText}`);
        setToast({
          variant: "success",
          message: response.data.message,
        });
      } catch (err) {
        setToast({
          variant: "danger",
          message: err.response?.data?.message || "Failed to mark attendance.",
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
          <h4 className="mb-3 text-center">Scan Attendance</h4>
          <div id="qr-reader"></div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceScanner;
