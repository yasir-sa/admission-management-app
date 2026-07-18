import axios from "axios";

// If VITE_API_BASE_URL is set (e.g. on Render), use it. Otherwise, derive
// the API host from whatever hostname the page itself was loaded from, so
// this works automatically on localhost AND on a LAN IP (phone testing)
// without ever needing to hand-edit .env when the WiFi IP changes.
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `http://${window.location.hostname}:5000/api`;

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Admin auth lives in an httpOnly cookie, not a header we attach — the
  // browser needs to send/receive it automatically on every request.
  withCredentials: true,
});

// These endpoints are public (teacher/student self-service links, holiday
// banners, and admin auth itself) — a 401 from them should never bounce the
// visitor to the admin login page.
const PUBLIC_PATH_SEGMENTS = [
  "/admin-auth",
  "/teacher-auth",
  "/attendance-auth",
  "/holidays",
];

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isPublicEndpoint = PUBLIC_PATH_SEGMENTS.some((seg) =>
      url.includes(seg)
    );
    if (error.response?.status === 401 && !isPublicEndpoint) {
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
