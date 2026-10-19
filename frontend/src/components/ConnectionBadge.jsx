import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { getQueue, getMeta, pendingCount, errorCount } from "../lib/offline";
import { trySync } from "../lib/api";

export default function ConnectionBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(pendingCount());
  const [errors, setErrors] = useState(errorCount());
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [meta, setMetaState] = useState(getMeta());
  const [failedOps, setFailedOps] = useState(getQueue().filter(o => o.status === "error"));

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setPending(pendingCount());
      setErrors(errorCount());
      setMetaState(getMeta());
      setFailedOps(getQueue().filter(o => o.status === "error"));
    };
    const on = () => { setOnline(true); refresh(); };
    const off = () => { setOnline(false); refresh(); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const i = setInterval(refresh, 2000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(i); };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await trySync();
    setSyncing(false);
    setPending(pendingCount());
    setErrors(errorCount());
    setMetaState(getMeta());
    setFailedOps(getQueue().filter(o => o.status === "error"));
  };

  // State determination
  let state, label, color, Icon;
  if (!online) { state = "offline"; label = "OFFLINE"; color = "bg-orange-500/15 border-orange-500/40 text-orange-300"; Icon = WifiOff; }
  else if (syncing) { state = "syncing"; label = "SINCRONIZANDO"; color = "bg-blue-500/15 border-blue-500/40 text-blue-300"; Icon = RefreshCw; }
  else if (errors > 0) { state = "error"; label = "ERRO SYNC"; color = "bg-red-500/15 border-red-500/40 text-red-300"; Icon = AlertCircle; }
  else if (pending > 0) { state = "pending"; label = "PENDENTE"; color = "bg-amber-500/15 border-amber-500/40 text-amber-300"; Icon = RefreshCw; }
  else { state = "online"; label = "ONLINE"; color = "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"; Icon = Wifi; }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        data-testid="connection-badge"
        className={`fixed top-3 right-3 md:top-4 md:right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wider ${color} ${syncing ? "animate-pulse" : ""}`}
      >
        <Icon size={12} className={syncing ? "animate-spin" : ""} />
        <span>{label}</span>
        {pending > 0 && <span className="bg-black/40 px-1.5 rounded-full">{pending}</span>}
      </button>

      {open && (
        <div className="fixed top-14 right-3 md:right-4 z-40 w-72 bg-[#121215] border border-[#D4AF37]/30 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display text-sm font-bold text-zinc-100">Status de Sincronização</h4>
            <button onClick={() => setOpen(false)} className="text-zinc-500 text-xs">✕</button>
          </div>
          <div className="space-y-2 text-xs">
            <Row label="Conexão" value={online ? <span className="text-emerald-400">🟢 Online</span> : <span className="text-orange-400">🟠 Offline</span>} />
            <Row label="Fila pendente" value={<span className={pending > 0 ? "text-amber-400" : "text-zinc-400"}>{pending}</span>} />
            <Row label="Com erro" value={<span className={errors > 0 ? "text-red-400" : "text-zinc-400"}>{errors}</span>} />
            <Row label="Sincronizados (sessão)" value={<span className="text-emerald-400">{meta.syncedCount || 0}</span>} />
            <Row label="Última sync" value={<span className="text-zinc-400 mono">{meta.lastSyncAt ? new Date(meta.lastSyncAt).toLocaleTimeString("pt-BR") : "nunca"}</span>} />
          </div>
          {failedOps.length > 0 && (
            <div className="mt-3 border-t border-red-900/40 pt-3 space-y-2">
              <p className="text-xs font-semibold text-red-300">Registros com falha (preservados)</p>
              {failedOps.map((op) => (
                <div key={op.id} className="rounded-lg border border-red-900/40 bg-red-950/20 p-2 text-[11px] text-zinc-300 break-words space-y-1">
                  <p><strong>Operação:</strong> {op.method || "?"} {op.url || "?"}</p>
                  <p><strong>ID:</strong> {op.id}</p>
                  <p><strong>Criada:</strong> {op.createdAt ? new Date(op.createdAt).toLocaleString("pt-BR") : "Não informado"}</p>
                  <p><strong>Tentativas:</strong> {op.attempts || 0}</p>
                  <p className="text-red-300"><strong>Motivo:</strong> {typeof op.lastError === "string" ? op.lastError : JSON.stringify(op.lastError || "Erro não informado")}</p>
                </div>
              ))}
              <p className="text-[10px] text-amber-300">Nenhum registro com erro será apagado ou reenviado automaticamente. Confirme no servidor se a operação já foi registrada antes de tentar novamente, para evitar duplicidade.</p>
            </div>
          )}
          {online && pending + errors > 0 && (
            <button onClick={handleSync} disabled={syncing} data-testid="sync-now-btn" className="w-full mt-3 py-2 bg-[#D4AF37] text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar Agora"}
            </button>
          )}
          <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-zinc-500 leading-relaxed">
            Vendas e entradas da portaria continuam funcionando offline. Serão enviadas automaticamente quando a conexão voltar.
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
