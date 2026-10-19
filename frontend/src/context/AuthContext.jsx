import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { warmCache, startBackgroundWarm, stopBackgroundWarm } from "../lib/precache";
import { rememberLogin, tryOfflineLogin, getCachedMe, clearOfflineAuth } from "../lib/offlineAuth";

const AuthCtx = createContext(null);

function isNetworkError(err) {
  return !err?.response && (err?.code === "ECONNABORTED" || err?.message === "Network Error" || !navigator.onLine);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dlotus_token");
    if (!token) {
      setLoading(false);
      return;
    }
    // If token is offline-only, use cached me
    if (token.startsWith("offline_")) {
      const cached = getCachedMe();
      if (cached) setUser(cached);
      setLoading(false);
      // When back online, auto-sync will handle it
      return;
    }
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("dlotus_me_cache_v1", JSON.stringify(r.data));
        warmCache().finally(() => startBackgroundWarm());
      })
      .catch((err) => {
        if (isNetworkError(err)) {
          const cached = getCachedMe();
          if (cached) {
            setUser(cached);
            return;
          }
        }
        localStorage.removeItem("dlotus_token");
      })
      .finally(() => setLoading(false));
    return () => stopBackgroundWarm();
  }, []);

  const login = async (username, password) => {
    try {
      const { data } = await api.post("/auth/login", { username, password });
      localStorage.setItem("dlotus_token", data.token);
      setUser(data.user);
      // Save for offline reuse
      rememberLogin(username, password, data.user, data.token).catch(() => {});
      warmCache().then(() => startBackgroundWarm());
      return data.user;
    } catch (err) {
      if (isNetworkError(err)) {
        // Fallback to offline login
        const u = await tryOfflineLogin(username, password);
        setUser(u);
        return u;
      }
      throw err;
    }
  };

  const logout = () => {
    stopBackgroundWarm();
    localStorage.removeItem("dlotus_token");
    clearOfflineAuth();
    setUser(null);
  };

  const can = (perm) => {
    if (!user) return false;
    if ((user.role || "").toLowerCase() === "administrador") return true;
    return (user.permissions || []).includes(perm);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
