// D'Lotus PDV — Pre-cache critical GET endpoints for offline-first UX
import { cacheSet } from "./offline";
import axios from "axios";

const BASE = process.env.REACT_APP_LAN_MODE === "1"
  ? `${window.location.protocol}//${window.location.hostname}:8001`
  : process.env.REACT_APP_BACKEND_URL;
const API = `${BASE}/api`;

const PRECACHE_PATHS = [
  "/categories",
  "/products",
  "/tables",
  "/printers",
  "/cashiers",
  "/portaria/config",
  "/portaria/cash/current",
  "/portaria/clients",
  "/users",
];

export async function warmCache(onProgress) {
  const token = localStorage.getItem("dlotus_token");
  if (!token || !navigator.onLine) return { ok: false, cached: 0 };
  const headers = { Authorization: `Bearer ${token}` };
  let done = 0;
  const results = await Promise.allSettled(
    PRECACHE_PATHS.map(async (path) => {
      try {
        const r = await axios.get(`${API}${path}`, { headers, timeout: 8000 });
        cacheSet(path, r.data);
        done++;
        if (onProgress) onProgress(done, PRECACHE_PATHS.length, path);
      } catch (e) {
        // ignore (403 for users without permission etc)
      }
    })
  );
  return { ok: true, cached: done, total: PRECACHE_PATHS.length };
}

// Fire-and-forget background refresh every 2 minutes while online
let timer = null;
export function startBackgroundWarm() {
  if (timer) return;
  warmCache();
  timer = setInterval(() => { if (navigator.onLine) warmCache(); }, 120000);
}
export function stopBackgroundWarm() {
  if (timer) { clearInterval(timer); timer = null; }
}
