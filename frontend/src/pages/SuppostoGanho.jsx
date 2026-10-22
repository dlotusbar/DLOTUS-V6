import { useEffect, useState } from "react";
import api, { formatBRL } from "../lib/api";
import { Users, Beer, DoorOpen, Flame, TrendingUp, Package, Wallet, Info, Eye, EyeOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const PERIODS = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Noite anterior" },
  { id: "last7", label: "7 dias" },
  { id: "month", label: "Mês" },
  { id: "custom", label: "Período" },
];

export default function SuppostoGanho() {
  const [period, setPeriod] = useState("today");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState(null);
  const [showMoney, setShowMoney] = useState(false);
  const money = (v) => showMoney ? formatBRL(v) : "R$ ••••";

  const load = () => {
    const q = new URLSearchParams();
    if (period === "custom") {
      if (start) q.set("start", new Date(start).toISOString());
      if (end) q.set("end", new Date(end).toISOString());
    } else {
      q.set("period", period);
    }
    api.get(`/dashboard/suposto-ganho?${q}`).then((r) => setData(r.data)).catch(() => {});
  };

  useEffect(() => { load(); const i = setInterval(load, 7000); return () => clearInterval(i); }, [period, start, end]);

  if (!data) return <div className="p-8 text-zinc-500">Carregando...</div>;

  const chartData = [
    { name: "Faturamento Portaria", valor: showMoney ? data.portaria.revenue : 0, color: "#A855F7" },
    { name: "Faturamento Produtos", valor: showMoney ? data.produtos.revenue : 0, color: "#D4AF37" },
    { name: "Lucro Produtos", valor: showMoney ? data.produtos.profit : 0, color: "#10B981" },
    { name: "Suposto Ganho", valor: showMoney ? data.suposto_ganho_total : 0, color: "#F3E5AB" },
  ];

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-1">Dashboard · Análise de Lucro</p>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold gold-text">Suposto Ganho</h1>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={() => setShowMoney(v => !v)} aria-label={showMoney ? "Ocultar valores do Suposto Ganho" : "Mostrar valores do Suposto Ganho"} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-[#18181D] text-zinc-100 text-sm">{showMoney ? <EyeOff size={18}/> : <Eye size={18}/>} {showMoney ? "Ocultar valores" : "Mostrar valores"}</button>
          {PERIODS.map((p) => (
            <button key={p.id} data-testid={`period-${p.id}`} onClick={() => setPeriod(p.id)} className={`px-3 py-2 rounded-lg text-xs transition ${period === p.id ? "bg-[#D4AF37] text-black font-bold" : "bg-[#18181D] text-zinc-400 hover:text-zinc-100"}`}>
              {p.label}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex gap-2">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-xs text-zinc-100" />
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="px-2 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-xs text-zinc-100" />
            </div>
          )}
        </div>
      </div>

      {/* HERO · SUPPOSTO GANHO */}
      <div className="bg-gradient-to-br from-emerald-900/30 via-[#121215] to-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-3xl p-6 md:p-8 gold-glow">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-2">🔥 Suposto Ganho da Noite</p>
            <p className="mono text-5xl md:text-7xl font-extrabold gold-text">{money(data.suposto_ganho_total)}</p>
            <div className="flex gap-4 mt-3 text-sm flex-wrap">
              <span className="text-zinc-300">Faturamento total: <span className="mono text-zinc-100 font-bold">{money(data.faturamento_total)}</span></span>
              <span className="text-zinc-300">Margem: <span className="mono text-emerald-400 font-bold">{showMoney ? `${data.margem_percent}%` : "••••"}</span></span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Lucro Portaria + Lucro Produtos</p>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-[10px] text-purple-300 uppercase tracking-widest">Portaria</p>
                <p className="mono text-xl font-bold text-purple-200">{money(data.portaria.profit)}</p>
              </div>
              <div className="text-zinc-600 text-2xl mt-3">+</div>
              <div>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest">Produtos</p>
                <p className="mono text-xl font-bold text-emerald-200">{money(data.produtos.profit)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARDS COMPARATIVOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="👥 Pessoas na casa" value={data.portaria.total_pessoas} />
        <Card label="🚹 Homens" value={data.portaria.homens} tone="blue" />
        <Card label="🚺 Mulheres" value={data.portaria.mulheres} tone="pink" />
        <Card label="🍾 Vendas" value={data.produtos.num_sales} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <BigCard icon={DoorOpen} label="🎟️ Faturamento Portaria" value={money(data.portaria.revenue)} subtitle="Entradas na porta" tone="purple" />
        <BigCard icon={Beer} label="🍾 Faturamento Produtos" value={money(data.produtos.revenue)} subtitle={`Custo: ${money(data.produtos.cost)}`} tone="gold" />
        <BigCard icon={Wallet} label="💰 Lucro Portaria" value={money(data.portaria.profit)} subtitle="100% (sem custo)" tone="purple-strong" />
        <BigCard icon={Package} label="📦 Lucro Produtos" value={money(data.produtos.profit)} subtitle={showMoney ? `Margem ${data.produtos.revenue ? ((data.produtos.profit / data.produtos.revenue) * 100).toFixed(1) : 0}%` : "Margem ••••"} tone="emerald" />
      </div>

      {/* GRÁFICO */}
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
        <h3 className="font-display text-xl font-bold mb-4 text-zinc-100">📊 Comparativo</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
            <XAxis dataKey="name" tick={{ fill: "#A1A1AA", fontSize: 11 }} />
            <YAxis tick={{ fill: "#A1A1AA", fontSize: 11 }} tickFormatter={(v) => showMoney ? `R$${v}` : "••••"} />
            <Tooltip
              active={showMoney ? undefined : false}
              contentStyle={{ background: "#18181D", border: "1px solid #D4AF37", borderRadius: 12 }}
              labelStyle={{ color: "#D4AF37" }}
              formatter={(v) => money(v)}
            />
            <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 flex-wrap justify-center text-xs">
          {chartData.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-zinc-400"><span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />{d.name}</span>
          ))}
        </div>
      </div>

      {/* PORTARIA BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
          <h3 className="font-display text-lg font-bold mb-3 text-zinc-100">🎟️ Portaria · por forma de pagamento</h3>
          <div className="space-y-2">
            {Object.entries(data.portaria.by_method).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-white/5 text-sm">
                <span className="text-zinc-300 capitalize">{k}</span>
                <span className="mono text-[#D4AF37]">{money(v)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-bold">
              <span className="text-zinc-100">Total Portaria</span>
              <span className="mono gold-text">{money(data.portaria.revenue)}</span>
            </div>
          </div>
        </div>
        <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
          <h3 className="font-display text-lg font-bold mb-3 text-zinc-100">🍾 Produtos · por forma de pagamento</h3>
          <div className="space-y-2">
            {Object.entries(data.produtos.by_method).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-white/5 text-sm">
                <span className="text-zinc-300 capitalize">{k}</span>
                <span className="mono text-[#D4AF37]">{money(v)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-bold">
              <span className="text-zinc-100">Total Produtos</span>
              <span className="mono gold-text">{money(data.produtos.revenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETALHAMENTO POR PRODUTO */}
      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-zinc-100">📋 Detalhamento por Produto</h3>
          <span className="text-xs text-zinc-500">{data.produtos.rows.length} produtos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
              <tr>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Venda</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Lucro Unit.</th>
                <th className="px-4 py-3 text-right">Faturamento</th>
                <th className="px-4 py-3 text-right">Lucro Total</th>
              </tr>
            </thead>
            <tbody>
              {data.produtos.rows.map((r) => (
                <tr key={r.product_id} className="border-t border-white/5 hover:bg-white/5" data-testid={`sg-row-${r.name}`}>
                  <td className="px-4 py-2 text-zinc-100">{r.name}</td>
                  <td className="px-4 py-2 mono text-right text-zinc-200">{r.qty}</td>
                  <td className="px-4 py-2 mono text-right text-zinc-300">{money(r.unit_price)}</td>
                  <td className="px-4 py-2 mono text-right text-zinc-400">{money(r.unit_cost)}</td>
                  <td className="px-4 py-2 mono text-right text-emerald-400">{money(r.unit_profit)}</td>
                  <td className="px-4 py-2 mono text-right text-[#D4AF37]">{money(r.revenue)}</td>
                  <td className="px-4 py-2 mono text-right text-emerald-400 font-bold">{money(r.profit)}</td>
                </tr>
              ))}
              {data.produtos.rows.length === 0 && (
                <tr><td colSpan="7" className="p-8 text-center text-zinc-500">Nenhum produto vendido no período.</td></tr>
              )}
            </tbody>
            {data.produtos.rows.length > 0 && (
              <tfoot className="bg-[#18181D]">
                <tr className="border-t-2 border-[#D4AF37]/30">
                  <td className="px-4 py-3 font-bold text-zinc-100" colSpan="5">TOTAL</td>
                  <td className="px-4 py-3 mono text-right font-bold text-[#D4AF37]">{money(data.produtos.revenue)}</td>
                  <td className="px-4 py-3 mono text-right font-bold gold-text">{money(data.produtos.profit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-amber-100/80">
          <strong>Suposto Ganho</strong> é uma <strong>estimativa de lucro operacional</strong> baseada apenas em preço de venda vs custo do produto. <strong>Não</strong> considera:
          salários de funcionários, bebidas de cortesia, aluguel, energia, impostos, taxas de cartão (debito/credito/pix sofrem taxa), fornecedores, segurança, atrações, marketing e demais despesas.
          Para o lucro real, subtraia essas despesas do suposto ganho.
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, tone }) {
  const tones = {
    blue: "border-blue-500/30 text-blue-100",
    pink: "border-pink-500/30 text-pink-100",
  };
  return (
    <div className={`bg-[#121215] border rounded-xl p-4 text-center ${tones[tone] || "border-white/5"}`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mono text-3xl font-bold mt-1 text-zinc-100">{value}</p>
    </div>
  );
}

function BigCard({ icon: Icon, label, value, subtitle, tone }) {
  const styles = {
    purple: "from-purple-500/10 to-transparent border-purple-500/30",
    "purple-strong": "from-purple-500/20 to-transparent border-purple-500/50",
    gold: "from-[#D4AF37]/10 to-transparent border-[#D4AF37]/30",
    emerald: "from-emerald-500/15 to-transparent border-emerald-500/40",
  };
  return (
    <div className={`bg-gradient-to-br ${styles[tone]} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-zinc-400 leading-tight">{label}</p>
        <Icon size={16} className="text-zinc-300" />
      </div>
      <p className="mono text-2xl md:text-3xl font-bold text-zinc-100">{value}</p>
      {subtitle && <p className="text-[11px] text-zinc-500 mt-1 mono">{subtitle}</p>}
    </div>
  );
}
