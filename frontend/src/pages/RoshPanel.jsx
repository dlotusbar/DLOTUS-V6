import NarguileControle from "./NarguileControle";
import { useEffect, useState } from "react";
import { Flame, Gift, Coins, CheckCircle2, Package, History as HistoryIcon } from "lucide-react";
import api, { formatDate } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import KitchenPanel from "./KitchenPanel";

function StatCard({ icon: Icon, label, value, color = "#D4AF37", testid }) {
  return (
    <div className="bg-[#121215] border border-white/5 rounded-2xl p-4 flex items-center gap-4" data-testid={testid}>
      <div className="p-3 rounded-xl" style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
        <div className="mono text-3xl font-black text-zinc-100 leading-none mt-1">{value}</div>
      </div>
    </div>
  );
}

export default function RoshPanel() {
  const { user } = useAuth();
  const isAtendente = (user?.role || "").trim().toLowerCase() === "atendente";
  const [stats, setStats] = useState({ total: 0, paid: 0, cortesia: 0 });
  const [view, setView] = useState("operacao"); // operacao | narguile

  useEffect(() => {
    const load = () => api.get("/kitchen/rosh/stats").then((r) => setStats(r.data)).catch(() => {});
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <div>
      <div className="px-6 lg:px-10 pt-6 lg:pt-10">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Flame className="text-[#D4AF37]" size={28} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Painel</p>
              <h1 className="font-display text-3xl font-extrabold gold-text">Rosh</h1>
            </div>
          </div>
          <div className="flex bg-[#18181D] rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setView("operacao")}
              data-testid="rosh-view-op"
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${view === "operacao" ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-zinc-100"}`}
            ><Flame size={14} /> Operação</button>
            <button
              onClick={() => setView("narguile")}
              data-testid="rosh-view-narguile"
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${view === "narguile" ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-zinc-100"}`}
            ><Package size={14} /> Narguilês</button>
          </div>
        </div>

        {view === "operacao" && (
          <>
            {!isAtendente && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <StatCard icon={CheckCircle2} label="Rosh entregues (hoje)" value={stats.total} color="#D4AF37" testid="rosh-stat-total" />
              <StatCard icon={Coins} label="Pagas" value={stats.paid} color="#4ade80" testid="rosh-stat-paid" />
              <StatCard icon={Gift} label="Cortesia" value={stats.cortesia} color="#f472b6" testid="rosh-stat-cortesia" />
            </div>}
            {!isAtendente && <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              * Conta apenas Rosh marcadas como <b className="text-[#D4AF37]">Entregues</b>. Pendentes, em produção e canceladas não entram no contador.
            </p>}
          </>
        )}
      </div>

      {view === "operacao" ? (
        <KitchenPanel kind="rosh" title="Rosh" icon={Flame} hideHeader />
      ) : (
        <NarguileControle />
      )}
    </div>
  );
}

// ---------------- Narguilé Conferência ----------------
function NarguileConference() {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "administrador";
  const [conf, setConf] = useState(null);
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/narguile/conference");
    setConf(data);
    setNotes(data.notes || "");
  };
  const loadHistory = () => api.get("/narguile/conference/history").then((r) => setHistory(r.data));
  useEffect(() => { load(); }, []);

  const update = async (field, value) => {
    const v = Math.max(0, Number(value) || 0);
    setConf((c) => ({ ...c, [field]: v }));
  };

  const save = async (silent = false) => {
    setSaving(true);
    try {
      const { data } = await api.put("/narguile/conference", {
        grande: Number(conf.grande || 0),
        pequeno: Number(conf.pequeno || 0),
        quebrado: Number(conf.quebrado || 0),
        notes,
      });
      setConf(data);
      if (!silent) toast.success("Quantidades salvas");
    } catch (e) { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const confirm = async () => {
    if (!window.confirm("Confirmar que todos os narguilés foram conferidos hoje?")) return;
    try {
      await save(true);
      const { data } = await api.post("/narguile/conference/confirm");
      setConf(data);
      toast.success("Conferência confirmada!");
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const openHistory = async () => { await loadHistory(); setShowHistory(true); };

  if (!conf) return <div className="p-10 text-zinc-500">Carregando...</div>;

  const locked = conf.confirmed && !isAdmin;

  const total = (Number(conf.grande) || 0) + (Number(conf.pequeno) || 0) + (Number(conf.quebrado) || 0);
  const totalFuncionando = (Number(conf.grande) || 0) + (Number(conf.pequeno) || 0);

  const items = [
    { key: "grande", label: "Narguilé Grande", color: "#D4AF37", icon: "🫧" },
    { key: "pequeno", label: "Narguilé Pequeno", color: "#60a5fa", icon: "💧" },
    { key: "quebrado", label: "Narguilé Quebrado", color: "#ef4444", icon: "⚠" },
  ];

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-zinc-100">Conferência de Narguilés</h2>
          <p className="text-sm text-zinc-500">Data: <span className="mono text-zinc-300">{conf.date}</span> {conf.confirmed && <span className="ml-2 text-emerald-400 font-bold">✓ Conferido</span>}</p>
        </div>
        <button onClick={openHistory} data-testid="narguile-history" className="px-3 py-2 bg-[#18181D] text-zinc-300 hover:text-[#D4AF37] rounded-lg text-sm flex items-center gap-2">
          <HistoryIcon size={14} /> Histórico
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.key} className="bg-[#121215] border-2 rounded-2xl p-4 min-w-0" style={{ borderColor: `${it.color}40` }} data-testid={`narguile-box-${it.key}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest truncate" style={{ color: it.color }}>{it.icon} {it.label}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => update(it.key, (conf[it.key] || 0) - 1)}
                disabled={locked}
                className="shrink-0 w-10 h-10 rounded-lg bg-[#0A0A0C] border border-white/10 text-zinc-300 text-xl font-bold hover:border-[#D4AF37]/60 disabled:opacity-30"
              >−</button>
              <input
                type="number"
                min="0"
                value={conf[it.key] || 0}
                onChange={(e) => update(it.key, e.target.value)}
                disabled={locked}
                data-testid={`narguile-input-${it.key}`}
                className="flex-1 min-w-0 w-full py-2 px-1 bg-[#0A0A0C] border border-white/10 rounded-lg text-2xl font-bold text-center mono text-zinc-100 focus:border-[#D4AF37] outline-none disabled:opacity-70"
                style={{ color: it.color }}
              />
              <button
                onClick={() => update(it.key, (conf[it.key] || 0) + 1)}
                disabled={locked}
                className="shrink-0 w-10 h-10 rounded-lg bg-[#0A0A0C] border border-white/10 text-zinc-300 text-xl font-bold hover:border-[#D4AF37]/60 disabled:opacity-30"
              >+</button>
            </div>
            <div className="flex gap-1 mt-3 flex-wrap">
              {[0, 5, 10, 15, 20].map((v) => (
                <button
                  key={v}
                  onClick={() => update(it.key, v)}
                  disabled={locked}
                  className="px-2 py-1 bg-[#0A0A0C] hover:bg-[#D4AF37]/15 hover:text-[#D4AF37] text-zinc-400 rounded text-xs mono disabled:opacity-30"
                >{v}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#121215] border border-white/5 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Total conferidos</div>
          <div className="mono text-2xl font-bold text-zinc-100 mt-1">{total}</div>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400">Funcionando (G + P)</div>
          <div className="mono text-2xl font-bold text-emerald-300 mt-1">{totalFuncionando}</div>
        </div>
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-red-400">Quebrados</div>
          <div className="mono text-2xl font-bold text-red-300 mt-1">{conf.quebrado || 0}</div>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-2">Observações (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={locked}
          placeholder="Ex: 2 grandes com mangueira trocada, 1 pequeno sem base..."
          data-testid="narguile-notes"
          rows="2"
          className="w-full px-3 py-2 bg-[#121215] border border-white/10 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:border-[#D4AF37] outline-none disabled:opacity-70"
        />
      </div>

      {conf.confirmed ? (
        <div className="bg-emerald-950/30 border-2 border-emerald-500/50 rounded-2xl p-6 text-center">
          <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={40} />
          <div className="font-display text-2xl font-bold text-emerald-300">✓ Narguilés Conferidos</div>
          <p className="text-sm text-emerald-200/70 mt-1">Confirmado em {formatDate(conf.confirmed_at)}</p>
          {isAdmin && (
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={() => save(false)}
                data-testid="narguile-admin-edit"
                className="px-4 py-2 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg text-sm font-bold hover:bg-[#D4AF37]/25"
              >🔓 Salvar edição (admin)</button>
            </div>
          )}
          {isAdmin && <p className="text-[10px] text-[#D4AF37]/70 mt-2 uppercase tracking-widest">* Modo administrador — você pode editar os valores mesmo depois de conferido</p>}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => save(false)}
            disabled={saving}
            data-testid="narguile-save"
            className="flex-1 min-w-[200px] py-3 bg-[#18181D] border border-white/10 text-zinc-200 rounded-xl font-bold hover:border-[#D4AF37]/40"
          >💾 Salvar quantidades</button>
          <button
            onClick={confirm}
            data-testid="narguile-confirm"
            className="flex-1 min-w-[200px] py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
          >
            <CheckCircle2 size={16} /> NARGUILÉS CONFERIDOS
          </button>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowHistory(false)}>
          <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-zinc-100 mb-4">Histórico de Conferências</h3>
            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x" tabIndex={0} aria-label="Tabela com rolagem horizontal"><table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="text-left py-2">Data</th>
                  <th className="text-right py-2">Grande</th>
                  <th className="text-right py-2">Pequeno</th>
                  <th className="text-right py-2">Quebrado</th>
                  <th className="text-center py-2">Conferido</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-white/5">
                    <td className="py-2 mono text-zinc-100">{h.date}</td>
                    <td className="py-2 text-right mono text-[#D4AF37]">{h.grande || 0}</td>
                    <td className="py-2 text-right mono text-blue-400">{h.pequeno || 0}</td>
                    <td className="py-2 text-right mono text-red-400">{h.quebrado || 0}</td>
                    <td className="py-2 text-center">{h.confirmed ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-600">—</span>}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-zinc-500">Sem registros.</td></tr>
                )}
              </tbody>
            </table></div>
            <button onClick={() => setShowHistory(false)} className="w-full mt-4 py-2 bg-[#18181D] rounded-lg text-zinc-300">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
