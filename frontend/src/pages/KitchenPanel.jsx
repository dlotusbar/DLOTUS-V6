import { useEffect, useState } from "react";
import PedidoSirene from "../components/PedidoSirene";
import { useAuth } from "../context/AuthContext";
import api, { formatBRL } from "../lib/api";
import { toast } from "sonner";
import { CheckCircle2, Clock, Play, History as HistoryIcon, X, Gift } from "lucide-react";

const fmtTime = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (_) { return "—"; }
};
const fmtDuration = (s) => {
  if (s === null || s === undefined) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

function KitchenPanel({ kind, title, icon: TitleIcon, hideHeader }) {
  const { user } = useAuth();
  const somenteLeitura = String(user?.role || "").toLowerCase() === "atendente";
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("queue"); // queue | history
  const [history, setHistory] = useState([]);

  const loadQueue = () => api.get(`/kitchen/${kind}`).then((r) => setItems(r.data)).catch(() => {});
  const loadHistory = () => api.get(`/kitchen/${kind}/history`).then((r) => setHistory(r.data)).catch(() => {});

  useEffect(() => {
    const run = () => { loadQueue(); if (tab === "history") loadHistory(); };
    run();
    const i = setInterval(run, 4000);
    return () => clearInterval(i);
  }, [kind, tab]);

  const act = async (it, status) => {
    if (somenteLeitura) return;
    try {
      await api.put(`/orders/${it.order_id}/items/${it.id}`, { status });
      toast.success(status === "delivered" ? (kind === "rosh" ? "Rosh enviado!" : "Item entregue!") : "Em produção");
      loadQueue();
    } catch (e) { toast.error("Erro"); }
  };

  const columns = ["waiting", "producing"];
  const labels = { waiting: "Aguardando", producing: "Em Produção" };
  const colors = {
    waiting: "border-orange-500/50 bg-orange-950/20",
    producing: "border-amber-500/60 bg-amber-950/30",
  };

  const historyTotalValue = history.reduce((s, h) => s + Number(h.cortesia ? 0 : h.subtotal || 0), 0);

  return (
    <div className="p-6 lg:p-10 pb-24">
      <PedidoSirene kind={kind} items={items} />
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        {!hideHeader && (
          <div className="flex items-center gap-3">
            <TitleIcon className="text-[#D4AF37]" size={28} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Painel</p>
              <h1 className="font-display text-3xl font-extrabold gold-text">{title}</h1>
            </div>
          </div>
        )}
        {hideHeader && <div />}
        {somenteLeitura && <span className="text-xs text-sky-300">Somente visualização — atendente</span>}
        <div className="flex bg-[#18181D] rounded-lg p-1 border border-white/5">
          <button
            onClick={() => setTab("queue")}
            data-testid="tab-queue"
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${tab === "queue" ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-zinc-100"}`}
          ><Play size={14} /> Fila ativa</button>
          <button
            onClick={() => setTab("history")}
            data-testid="tab-history"
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${tab === "history" ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-zinc-100"}`}
          ><HistoryIcon size={14} /> Histórico (hoje)</button>
        </div>
      </div>

      {tab === "queue" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {columns.map((status) => {
            const list = items.filter((i) => i.status === status);
            return (
              <div key={status} className={`border rounded-2xl p-4 ${colors[status]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-lg font-bold text-zinc-100">{labels[status]}</h3>
                  <span className="mono text-sm text-zinc-400">{list.length}</span>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {list.length === 0 && <p className="text-sm text-zinc-500">Nenhum item.</p>}
                  {list.map((it) => (
                    <div key={it.id} className="bg-[#121215] border border-white/5 rounded-xl p-3" data-testid={`kds-item-${it.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs uppercase tracking-widest text-[#D4AF37]">{it.table_label}</span>
                        <span className="mono text-xs text-zinc-500">{fmtTime(it.created_at)}</span>
                      </div>
                      <div className="text-zinc-100 font-medium flex items-center gap-1">
                        {it.cortesia && <Gift size={12} className="text-pink-400" />}
                        {it.quantity}× {it.product_name}
                      </div>
                      {it.note && <div className="text-xs text-zinc-500 mt-1">Obs: {it.note}</div>}
                      {!somenteLeitura && <div className="flex gap-2 mt-3">
                        {status === "waiting" && (
                          <button onClick={() => act(it, "producing")} data-testid={`start-${it.id}`} className="flex-1 py-2 bg-amber-900/40 text-amber-300 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-amber-800/40"><Play size={12} /> Iniciar</button>
                        )}
                        <button onClick={() => act(it, "delivered")} data-testid={`deliver-${it.id}`} className="flex-1 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 size={12} /> {kind === "rosh" ? "Rosh Enviado" : "Entregue"}
                        </button>
                      </div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden" data-testid="history-table">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-wrap gap-2">
            <h3 className="font-display text-lg font-bold text-zinc-100 flex items-center gap-2">
              <HistoryIcon size={16} className="text-[#D4AF37]" /> Histórico de hoje · {history.length} itens
            </h3>
            <div className="text-sm text-zinc-400">
              Faturamento efetivo: <span className="mono font-bold text-[#D4AF37]">{formatBRL(historyTotalValue)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x" tabIndex={0} aria-label="Tabela com rolagem horizontal"><table className="w-full text-sm">
              <thead className="bg-[#18181D] text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Mesa / ID</th>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-center">Qtd</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Pagamento</th>
                  <th className="px-3 py-2 text-center" title="Horário em que o caixa enviou">Enviado</th>
                  <th className="px-3 py-2 text-center" title="Horário em que o Bar/Rosh iniciou o preparo">Preparo</th>
                  <th className="px-3 py-2 text-center" title="Horário em que foi marcado como entregue">Entregue</th>
                  <th className="px-3 py-2 text-center">Envio→Prep</th>
                  <th className="px-3 py-2 text-center">Prep→Entrega</th>
                  <th className="px-3 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-zinc-500">Nenhum item entregue hoje.</td></tr>
                )}
                {history.map((h) => (
                  <tr key={h.item_id} className="hover:bg-white/5" data-testid={`history-row-${h.item_id}`}>
                    <td className="px-3 py-2 font-bold text-zinc-100">
                      {h.table_label}
                      <div className="text-[9px] font-normal text-zinc-500 mono">#{(h.order_id || "").slice(0, 6)}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-200">
                      {h.cortesia && <Gift size={10} className="inline text-pink-400 mr-1" />}
                      {h.product_name}
                      {h.cortesia && <span className="ml-1 text-[9px] uppercase tracking-widest text-pink-400">cortesia</span>}
                    </td>
                    <td className="px-3 py-2 text-center mono text-zinc-100">{h.quantity}</td>
                    <td className={`px-3 py-2 text-right mono font-bold ${h.cortesia ? "text-pink-400 line-through" : "text-[#D4AF37]"}`}>
                      {formatBRL(h.cortesia ? 0 : h.subtotal)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${h.order_status === "paid" ? "bg-emerald-950/40 text-emerald-300" : h.order_status === "cancelled" ? "bg-red-950/40 text-red-400" : "bg-zinc-900 text-zinc-400"}`}>
                        {h.payment_method || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center mono text-xs text-zinc-300">{fmtTime(h.sent_at)}</td>
                    <td className="px-3 py-2 text-center mono text-xs text-amber-300">{fmtTime(h.producing_at)}</td>
                    <td className="px-3 py-2 text-center mono text-xs text-blue-300">{fmtTime(h.delivered_at)}</td>
                    <td className="px-3 py-2 text-center mono text-xs text-zinc-400">{fmtDuration(h.seconds_sent_to_prep)}</td>
                    <td className="px-3 py-2 text-center mono text-xs text-zinc-400">{fmtDuration(h.seconds_prep_to_delivered)}</td>
                    <td className="px-3 py-2 text-center mono text-xs font-bold text-zinc-100">{fmtDuration(h.seconds_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
          <div className="px-4 py-3 text-[10px] text-zinc-600 border-t border-white/5 uppercase tracking-widest">
            * Mostra todos os itens com status <b className="text-[#D4AF37]">Entregue</b> do dia. {kind !== "rosh" ? "" : "Cortesias contam no total mas não entram no faturamento."}
          </div>
        </div>
      )}
    </div>
  );
}

export default KitchenPanel;
