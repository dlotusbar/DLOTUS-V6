import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, User, Download, WifiOff } from "lucide-react";
import { warmCache } from "../lib/precache";
import { listOfflineUsernames } from "../lib/offlineAuth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const { login } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    setOfflineUsers(listOfflineUsernames());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username.toLowerCase().trim(), password);
      const offline = !navigator.onLine;
      toast.success(offline ? `Login offline realizado — ${u.name}` : "Bem-vindo à D'Lotus");
      const onlyCompras = u.role?.toLowerCase() !== "administrador" && (u.permissions || []).length === 1 && u.permissions[0] === "estoque";
      const destination = onlyCompras ? "/compras" : "/dashboard";
      if (online) {
        setCacheStatus({ done: 0, total: 9 });
        warmCache((done, total) => setCacheStatus({ done, total })).then(() => {
          setTimeout(() => navigate(destination), 400);
        });
      } else {
        setTimeout(() => navigate(destination), 300);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Erro ao entrar");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: settings.colors?.body_bg || "#000" }}>
      {settings.login?.bg_image && settings.login?.bg_mode !== "none" && (
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${settings.login.bg_image})`,
          backgroundSize: settings.login.bg_mode,
          backgroundPosition: settings.login.bg_position,
          backgroundRepeat: "no-repeat",
        }} />
      )}
      {settings.login?.bg_image && (
        <div className="absolute inset-0 bg-black" style={{ opacity: (settings.login.bg_opacity || 20) / 100 }} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.18),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8">
          <img
            src={settings.general?.logo_login || "/dlotus-logo-sm.png"}
            alt={settings.general?.app_name || "D'Lotus"}
            className="w-72 md:w-80 mx-auto mb-2 drop-shadow-[0_0_40px_rgba(56,189,248,0.5)]"
          />
          <p className="text-zinc-500 text-sm mt-2 tracking-[0.3em] uppercase">{settings.general?.subtitle || "Sistema de Ponto de Venda"}</p>
          {!online && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/15 border border-orange-500/40 rounded-full text-xs text-orange-300">
              <WifiOff size={12} /> Modo Offline · {offlineUsers.length > 0 ? `${offlineUsers.length} usuário(s) disponível(is)` : "primeiro login exige internet"}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-[#0a0a0c]/80 border border-cyan-500/20 rounded-2xl p-8 space-y-5 shadow-[0_0_60px_rgba(56,189,248,0.15)]">
          <div>
            <label className="block text-xs uppercase tracking-widest text-cyan-300/70 mb-2">Usuário</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                data-testid="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-3 py-3 bg-black/60 border border-cyan-500/20 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
                placeholder="admin"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-cyan-300/70 mb-2">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-black/60 border border-cyan-500/20 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
                placeholder="••••••"
              />
            </div>
          </div>
          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
          >
            {loading ? (cacheStatus ? `Preparando cache offline (${cacheStatus.done}/${cacheStatus.total})...` : "Entrando...") : "ENTRAR"}
          </button>
          {cacheStatus && (
            <div className="flex items-center justify-center gap-2 text-xs text-cyan-300/70">
              <Download size={12} className="animate-pulse" />
              Baixando dados para funcionar offline...
            </div>
          )}
          <p className="text-xs text-center text-zinc-500 mt-4">
            Demo: <span className="text-cyan-400">admin / admin</span>
          </p>
        </form>
      </div>
    </div>
  );
}
