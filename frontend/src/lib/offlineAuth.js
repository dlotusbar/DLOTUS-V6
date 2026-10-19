// D'Lotus PDV — Offline authentication helper
// Allows users to log in without internet after they've logged in online at least once.

const USERS_KEY = "dlotus_offline_users_v1";
const ME_KEY = "dlotus_me_cache_v1";

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; }
}
function writeUsers(obj) {
  localStorage.setItem(USERS_KEY, JSON.stringify(obj));
}

export async function rememberLogin(username, password, user, token) {
  const users = readUsers();
  const h = await sha256(password);
  users[username.toLowerCase().trim()] = {
    hash: h,
    user,
    token,
    savedAt: new Date().toISOString(),
  };
  writeUsers(users);
  localStorage.setItem(ME_KEY, JSON.stringify(user));
}

export async function tryOfflineLogin(username, password) {
  const key = username.toLowerCase().trim();
  const users = readUsers();
  const rec = users[key];
  if (!rec) {
    const err = new Error("Este usuário ainda não logou neste computador. Conecte-se à internet pelo menos uma vez para habilitar login offline.");
    err.offline_no_user = true;
    throw err;
  }
  const h = await sha256(password);
  if (h !== rec.hash) {
    const err = new Error("Usuário ou senha inválidos");
    err.offline_bad_password = true;
    throw err;
  }
  // Reuse last token (will refresh when back online)
  const token = rec.token || `offline_${Date.now()}`;
  localStorage.setItem("dlotus_token", token);
  localStorage.setItem(ME_KEY, JSON.stringify(rec.user));
  return rec.user;
}

export function getCachedMe() {
  try { return JSON.parse(localStorage.getItem(ME_KEY) || "null"); } catch { return null; }
}

export function clearOfflineAuth() {
  localStorage.removeItem(ME_KEY);
}

export function listOfflineUsernames() {
  return Object.keys(readUsers());
}
