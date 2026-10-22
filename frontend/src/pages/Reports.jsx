import { useEffect, useState } from "react";
import api, { formatBRL, formatDate } from "../lib/api";
import { Eye, EyeOff } from "lucide-react";

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [showMoney, setShowMoney] = useState(false);
  const money = (v) => showMoney ? formatBRL(v) : "R$ ••••";
  const [cashiers, setCashiers] = useState([]);
  const [cashierId, setCashierId] = useState("");
  const [start, setStart] = useState("");
  const [historyMode, setHistoryMode] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState("");
  const [end, setEnd] = useState("");

  const load = () => {
    const q = new URLSearchParams();
    if (cashierId) q.append("cashier_id", cashierId);
    if (start) q.append("start", start);
    if (end) q.append("end", end);
    api.get(`/reports/sales?${q}`).then((r) => { setSales(r.data); setError(""); }).catch(() => setError("Não foi possível consultar as vendas. Confira a conexão e as permissões."));
  };
  useEffect(() => { api.get("/cashiers").then((r) => setCashiers(r.data)); load(); }, []);
  useEffect(() => { load(); }, [cashierId, start, end]);

  const norm = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const filtered = sales.filter((sale) => {
    const query = norm(historyQuery);
    if (!query || historyMode === "all") return true;
    if (historyMode === "customer") return norm(sale.customer_name || sale.client_name || "").includes(query);
    const label = norm(sale.table_label || "");
    const number = (label.match(/(?:mesa|bistro|bistrô)\s*(\d+)/) || [])[1];
    const wanted = query.replace(/^(mesa|bistro|bistrô)\s*/, "").replace(/^0+/, "");
    return number ? String(Number(number)) === wanted : label === query;
  });
  const exportCSV = () => {
    const rows = [["Data", "Mesa", "Cliente", "Produtos", "Pagamento", "Total"], ...filtered.map(s => [s.closed_at || "", s.table_label || "", s.customer_name || s.client_name || "", (s.items || []).filter(i => i.status !== "cancelled").map(i => `${i.quantity}x ${i.product_name}`).join("; "), (s.payments || []).map(p => `${p.method}: ${p.amount}`).join("; "), s.total || 0])];
    const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"})); link.download = "historico-consumo-dlotus.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  const printHistory = () => {
    const escapeHTML = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const body = filtered.map(s => `<section><h3>${escapeHTML(s.table_label)} — ${escapeHTML(s.customer_name || "Cliente não informado")}</h3><p>${escapeHTML(s.closed_at)} | Total: ${escapeHTML(formatBRL(s.total))}</p><ul>${(s.items || []).filter(i => i.status !== "cancelled").map(i => `<li>${escapeHTML(i.quantity)} × ${escapeHTML(i.product_name)} — ${escapeHTML(formatBRL(i.subtotal))}</li>`).join("")}</ul><p>Pagamentos: ${escapeHTML((s.payments || []).map(p => `${p.method}: ${formatBRL(p.amount)}`).join(" | "))}</p></section>`).join("");
    const w = window.open("", "_blank"); if (!w) { setError("Permita pop-ups para imprimir o histórico."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Histórico de Consumo D'Lotus</title><style>body{font-family:Arial;padding:24px;color:#111}section{border-bottom:1px solid #ddd;padding:10px 0}h1{font-size:22px}h3{font-size:16px}li{margin:5px 0}</style></head><body><h1>D'Lotus — Histórico de Consumo</h1><p>Período: ${escapeHTML(start || "Início")} a ${escapeHTML(end || "Hoje")} | Vendas: ${filtered.length} | Total: ${escapeHTML(formatBRL(filtered.reduce((n,s)=>n+Number(s.total||0),0)))}</p>${body}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  const total = sales.reduce((s, o) => s + Number(o.total || 0), 0);
  const byMethod = {};
  const byProduct = {};
  sales.forEach((o) => {
    o.payments?.forEach((p) => { byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount); });
    o.items?.forEach((i) => {
      if (i.status === "cancelled") return;
      if (!byProduct[i.product_name]) byProduct[i.product_name] = { qty: 0, total: 0 };
      byProduct[i.product_name].qty += i.quantity; byProduct[i.product_name].total += i.subtotal;
    });
  });
  const topProd = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty).slice(0, 20);

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-extrabold gold-text">Relatórios</h1><button type="button" onClick={() => setShowMoney(v => !v)} aria-label={showMoney ? "Ocultar valores dos Relatórios" : "Mostrar valores dos Relatórios"} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-[#18181D] text-zinc-100">{showMoney ? <EyeOff size={19}/> : <Eye size={19}/>} {showMoney ? "Ocultar valores" : "Mostrar valores"}</button></div>
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5 flex flex-wrap gap-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-zinc-400">Caixa</label>
          <select value={cashierId} onChange={(e) => setCashierId(e.target.value)} data-testid="rep-cashier" className="block mt-1 px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg">
            <option value="">Todos</option>
            {cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-zinc-400">A partir de</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-zinc-400">Até</label>
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} data-testid="rep-end" className="block mt-1 px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
        </div>
      </div>

      <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-xl font-bold">Histórico de Consumo — Mesa ou Cliente</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-zinc-300">Pesquisar por
            <select className="block mt-1 p-2 bg-black border border-white/20 rounded-lg" value={historyMode} onChange={e => {setHistoryMode(e.target.value); setHistoryQuery("");}}>
              <option value="all">Todas as vendas</option><option value="table">Mesa</option><option value="customer">Cliente</option>
            </select>
          </label>
          {historyMode !== "all" && <label className="text-sm text-zinc-300">{historyMode === "table" ? "Número da mesa" : "Nome do cliente"}
            <input className="block mt-1 p-2 bg-black border border-white/20 rounded-lg" value={historyQuery} onChange={e => setHistoryQuery(e.target.value)} placeholder={historyMode === "table" ? "Ex.: 08" : "Nome do cliente"}/>
          </label>}
          <button onClick={printHistory} className="px-4 py-2 rounded-lg bg-blue-700 text-white">Imprimir / Salvar PDF</button>
          <button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-zinc-700 text-white">Exportar Excel (CSV)</button>
        </div>
        <p className="text-sm text-zinc-400">{filtered.length} vendas encontradas · Total: <strong className="text-white">{money(filtered.reduce((n,s)=>n+Number(s.total||0),0))}</strong></p>
        <p className="text-xs text-zinc-500">Pesquisa por cliente disponível para vendas com nome registrado. A consulta respeita o período e o caixa selecionados acima.</p>
        {error && <p role="alert" className="text-red-400">{error}</p>}
        <div className="space-y-2 max-h-[500px] overflow-auto">
          {filtered.map(s => <div key={s.id} className="border border-white/10 rounded-lg p-3">
            <button className="w-full text-left flex flex-wrap justify-between gap-2" onClick={() => setExpanded(p => ({...p,[s.id]:!p[s.id]}))}>
              <span>{s.table_label || "Venda Rápida"} · {s.customer_name || "Cliente não informado"}</span><span>{formatDate(s.closed_at)} · <b>{money(s.total)}</b> {expanded[s.id] ? "▲" : "▼"}</span>
            </button>
            {expanded[s.id] && <div className="mt-3 border-t border-white/10 pt-3 text-sm space-y-2">
              {(s.items || []).filter(i => i.status !== "cancelled").map((i,k) => <div key={k} className="flex justify-between"><span>{i.quantity}× {i.product_name}</span><span>{money(i.subtotal)}</span></div>)}
              <p className="text-zinc-400">Pagamentos: {(s.payments || []).map(p => `${p.method} ${money(p.amount)}`).join(" · ") || "Não informado"}</p>
            </div>}
          </div>)}
          {filtered.length === 0 && <p className="text-zinc-500">Nenhuma venda encontrada.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Vendas" value={sales.length} />
        <KPI label="Total" value={money(total)} />
        <KPI label="Ticket Médio" value={money(sales.length ? total / sales.length : 0)} />
        <KPI label="Itens Vendidos" value={Object.values(byProduct).reduce((s, p) => s + p.qty, 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#121215] border border-white/5 rounded-2xl p-5">
          <h3 className="font-display text-lg font-bold mb-3">Por forma de pagamento</h3>
          {Object.entries(byMethod).map(([m, v]) => (
            <div key={m} className="flex justify-between py-2 border-b border-white/5 text-sm">
              <span className="text-zinc-300 capitalize">{m}</span><span className="mono text-[#D4AF37]">{money(v)}</span>
            </div>
          ))}
          {Object.keys(byMethod).length === 0 && <p className="text-zinc-500 text-sm">Sem dados.</p>}
        </div>

        <div className="bg-[#121215] border border-white/5 rounded-2xl p-5">
          <h3 className="font-display text-lg font-bold mb-3">Produtos mais vendidos</h3>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {topProd.map(([n, v], i) => (
              <div key={n} className="flex justify-between py-1.5 border-b border-white/5 text-sm">
                <span className="text-zinc-300">#{i + 1} {n}</span>
                <span className="mono text-zinc-100">{v.qty}× · {money(v.total)}</span>
              </div>
            ))}
            {topProd.length === 0 && <p className="text-zinc-500 text-sm">Sem dados.</p>}
          </div>
        </div>
      </div>

      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
            <tr><th className="px-4 py-3 text-left">Mesa</th><th className="px-4 py-3 text-left">Fechada</th><th className="px-4 py-3 text-left">Caixa</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {sales.slice(0, 50).map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="px-4 py-2 text-zinc-100">{s.table_label}</td>
                <td className="px-4 py-2 mono text-zinc-400">{formatDate(s.closed_at)}</td>
                <td className="px-4 py-2 text-zinc-400">{cashiers.find((c) => c.id === s.cashier_id)?.name || "-"}</td>
                <td className="px-4 py-2 mono text-right text-[#D4AF37]">{money(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="bg-[#121215] border border-white/5 rounded-xl p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mono text-xl font-bold text-zinc-100 mt-1">{value}</p>
    </div>
  );
}
