import axios from "axios";
import { cacheGet, cacheSet, enqueue, uuid, processQueue } from "./offline";

const BASE = process.env.REACT_APP_LAN_MODE === "1"
  ? `${window.location.protocol}//${window.location.hostname}:8001`
  : process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

const raw = axios.create({ baseURL: API, timeout: 10000 });
raw.interceptors.request.use((config) => {
  const token = localStorage.getItem("dlotus_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Offline-aware client
// - GET: try network with 6s timeout; on failure fallback to cache
// - POST/PUT/DELETE: if network fails for whitelisted paths, queue it (idempotent via client-provided id)
const QUEUEABLE_WRITE_PATTERNS = [
  /^\/orders$/,                    // create order
  /^\/orders\/[^/]+\/items$/,     // add items
  /^\/orders\/[^/]+\/items\/[^/]+$/, // update item status
  /^\/orders\/[^/]+\/close$/,     // close order
  /^\/portaria\/entries$/,        // portaria entry
  /^\/portaria\/clients$/,        // client registration
];

function isQueueable(method, url) {
  if (!["post", "put", "delete"].includes(method?.toLowerCase())) return false;
  return QUEUEABLE_WRITE_PATTERNS.some((rx) => rx.test(url));
}

function isNetworkError(err) {
  return !err.response && (err.code === "ECONNABORTED" || err.message === "Network Error" || !navigator.onLine);
}

const client = {
  get: async (url, config) => {
    try {
      const r = await raw.get(url, config);
      cacheSet(url, r.data);
      return r;
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = cacheGet(url);
        if (cached !== null) return { data: cached, _offline: true };
      }
      throw err;
    }
  },
  post: async (url, data, config) => {
    try {
      return await raw.post(url, data, config);
    } catch (err) {
      if (isNetworkError(err) && isQueueable("post", url)) {
        // ensure idempotent id
        const payload = { ...(data || {}), id: data?.id || uuid() };
        enqueue({ method: "POST", url, data: payload });
        return { data: payload, _queued: true };
      }
      throw err;
    }
  },
  patch: async (url, data, config) => raw.patch(url, data, config),
  put: async (url, data, config) => {
    try { return await raw.put(url, data, config); }
    catch (err) {
      if (isNetworkError(err) && isQueueable("put", url)) {
        enqueue({ method: "PUT", url, data });
        return { data, _queued: true };
      }
      throw err;
    }
  },
  delete: async (url, config) => {
    try { return await raw.delete(url, config); }
    catch (err) {
      if (isNetworkError(err) && isQueueable("delete", url)) {
        enqueue({ method: "DELETE", url, data: null });
        return { data: { ok: true }, _queued: true };
      }
      throw err;
    }
  },
  request: raw.request.bind(raw),
};

// Auto-sync when online
let syncing = false;
export async function trySync() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try { await processQueue(raw); }
  finally { syncing = false; }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", trySync);
  // periodic sync every 30s
  setInterval(trySync, 30000);
  // initial attempt
  setTimeout(trySync, 2000);
}

export default client;

export const formatBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0));

export const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};
