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
});

export default API;
