// D'Lotus PDV — Offline-first store with sync queue
// Uses localStorage for durability (simple + safe). Each queued op has client UUID for idempotency.

const QUEUE_KEY = "dlotus_sync_queue_v1";
const CACHE_KEY = "dlotus_cache_v1";
const META_KEY = "dlotus_sync_meta_v1";

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error("storage full", e); }
}

// -------- Cache (GET responses) --------
export function cacheGet(path) {
  const c = readJSON(CACHE_KEY, {});
  return c[path]?.data ?? null;
}
export function cacheSet(path, data) {
  const c = readJSON(CACHE_KEY, {});
  c[path] = { data, at: Date.now() };
  writeJSON(CACHE_KEY, c);
}
export function cacheClear() { localStorage.removeItem(CACHE_KEY); }

// -------- Queue (pending writes) --------
export function enqueue(op) {
  // op: { id, method, url, data, createdAt, attempts, lastError, status }
  const q = readJSON(QUEUE_KEY, []);
  op.id = op.id || uuid();
  op.createdAt = op.createdAt || new Date().toISOString();
  op.attempts = 0;
  op.status = "pending";
  q.push(op);
  writeJSON(QUEUE_KEY, q);
  return op;
}
export function getQueue() { return readJSON(QUEUE_KEY, []); }
export function updateOp(id, patch) {
  const q = readJSON(QUEUE_KEY, []);
  const idx = q.findIndex((o) => o.id === id);
  if (idx === -1) return;
  q[idx] = { ...q[idx], ...patch };
  writeJSON(QUEUE_KEY, q);
}
export function removeOp(id) {
  const q = readJSON(QUEUE_KEY, []).filter((o) => o.id !== id);
  writeJSON(QUEUE_KEY, q);
}

export function getMeta() {
  return readJSON(META_KEY, { lastSyncAt: null, syncedCount: 0, lastError: null });
}
export function setMeta(patch) {
  writeJSON(META_KEY, { ...getMeta(), ...patch });
}

// -------- Sync processor --------
export async function processQueue(apiClient) {
  const q = getQueue().filter((o) => o.status === "pending" || o.status === "syncing");
  if (q.length === 0) return { processed: 0, failed: 0 };
  let processed = 0, failed = 0;
  for (const op of q) {
    try {
      updateOp(op.id, { attempts: (op.attempts || 0) + 1, status: "syncing" });
      await apiClient.request({ method: op.method, url: op.url, data: op.data });
      removeOp(op.id);
      processed++;
      setMeta({ syncedCount: getMeta().syncedCount + 1 });
    } catch (err) {
      // If server returned 4xx (bad request) — treat as permanent failure, keep in queue for review but don't block
      const status = err?.response?.status;
      const permanent = status && status >= 400 && status < 500;
      updateOp(op.id, {
        status: permanent ? "error" : "pending",
        lastError: err?.response?.data?.detail || err.message,
      });
      failed++;
      if (!permanent) break; // stop on network/5xx and retry later
    }
  }
  setMeta({ lastSyncAt: new Date().toISOString(), lastError: failed > 0 ? "Alguns registros falharam" : null });
  return { processed, failed };
}

export function pendingCount() {
  return getQueue().filter((o) => o.status !== "done" && o.status !== "error").length;
}
export function errorCount() {
  return getQueue().filter((o) => o.status === "error").length;
}
