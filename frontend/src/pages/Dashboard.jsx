import { useEffect, useState } from "react";
import api, { formatBRL } from "../lib/api";
import { TrendingUp, Users, Receipt, Trophy, Moon, DoorOpen, Beer, X, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [portaria, setPortaria] = useState(null);
  const [selectedCash, setSelectedCash] = useState(null);

  const load = () => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
    if (can("portaria")) api.get("/portaria/night-view").then((r) => setPortaria(r.data)).catch(() => {});
  };
  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  if (!data) return <div className="p-8 text-zinc-500">Carregando...</div>;

  const barTotal = Number(data.totals.total || 0);
  const portTotal = Number(portaria?.total || 0);
  const totalNoite = barTotal + portTotal;

  // Faturamento combinado por forma de pagamento (Bar + Portaria)
  const methodKey = { dinheiro: "Dinheiro", pix: "Pix", credito: "Crédito", debito: "Débito" };
  const combined = {};
  Object.keys(methodKey).forEach((k) => {
    combined[k] = Number(data.totals[k] || 0) + Number(portaria?.totals?.[k] || 0);
  });
  const tefTotal = Number(data.totals.tef || 0);

  const cashDetails = selectedCash?.type === "portaria"
    ? { name: "Caixa Portaria", total: portTotal, totals: portaria?.totals || {} }
    : data.by_cashier.find((cash) => cash.id === selectedCash?.id);

  return (
    <div className="min-w-0 p-3 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 pb-24">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-1">Dashboard da Noite</p>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold gold-text">Visão Geral · Tempo Real</h1>
      </div>

      {/* ========== HERO: TOTAL DA NOITE (Bar + Portaria) ========== */}
      <div className="min-w-0 bg-gradient-to-br from-[#D4AF37]/15 via-[#121215] to-purple-900/20 border border-[#D4AF37]/40 rounded-3xl p-4 sm:p-6 md:p-8 gold-glow">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 w-full lg:w-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-2">💵 Total Arrecadado · Noite</p>
            <p className="mono block max-w-full text-[clamp(1.3rem,6.8vw,3rem)] md:text-6xl leading-tight font-extrabold gold-text break-words [overflow-wrap:anywhere]">{formatBRL(totalNoite)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm min-w-0">
              <span className="flex flex-wrap items-center gap-1.5 text-zinc-300 min-w-0 break-words"><Beer size={14} className="text-[#D4AF37]" /> Balcão: <span className="mono text-zinc-100 font-bold break-words [overflow-wrap:anywhere]">{formatBRL(barTotal)}</span></span>
              {portaria && <span className="flex flex-wrap items-center gap-1.5 text-zinc-300 min-w-0 break-words"><DoorOpen size={14} className="text-[#D4AF37]" /> Portaria: <span className="mono text-zinc-100 font-bold break-words [overflow-wrap:anywhere]">{formatBRL(portTotal)}</span></span>}
            </div>
          </div>
          {portaria && (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full min-w-0 md:w-auto">
              <PeopleCard label="👨 Homens" value={portaria.homens} color="blue" />
              <PeopleCard label="👩 Mulheres" value={portaria.mulheres} color="pink" />
              <PeopleCard label="👥 Total" value={portaria.total_pessoas} color="gold" />
            </div>
          )}
        </div>
      </div>

      {/* ========== MELHOR HORARIO DE VENDA · V5 ========== */}
      <section className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-5 md:p-6" data-testid="melhor-horario-venda">
        <h2 className="font-display text-xl md:text-2xl font-bold text-[#D4AF37] mb-2">Melhor Horário de Venda</h2>
        <p className="text-zinc-400 text-sm mb-4">Vendas pagas agrupadas pela hora da confirmação · horário de São Paulo</p>
        {data.melhor_horario ? (
          <div className="mb-5 rounded-xl bg-[#D4AF37]/10 p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-widest">Horário campeão</p>
            <p className="text-white font-bold text-xl">{String(data.melhor_horario.hora).padStart(2, "0")}:00–{String((data.melhor_horario.hora + 1) % 24).padStart(2, "0")}:00</p>
            <p className="text-[#D4AF37] font-semibold">{formatBRL(data.melhor_horario.faturamento)} · {data.melhor_horario.quantidade} vendas</p>
          </div>
        ) : <p className="text-zinc-500 mb-4">Nenhuma venda paga com horário válido no período.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(data.horario_vendas || []).filter((h) => h.quantidade > 0).sort((a, b) => a.hora - b.hora).map((h) => (
            <div key={h.hora} className="min-w-0 rounded-lg border border-white/10 p-2 sm:p-3 bg-black/20">
              <p className="text-zinc-300 text-xs">{String(h.hora).padStart(2, "0")}:00</p>
              <p className="text-white font-bold text-xs sm:text-base break-words [overflow-wrap:anywhere]">{formatBRL(h.faturamento)}</p>
              <p className="text-zinc-500 text-xs">{h.quantidade} vendas</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== KPIs ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI label="Total Vendido (Balcão)" value={formatBRL(barTotal)} icon={TrendingUp} />
        <KPI label="Vendas" value={data.num_sales} icon={Users} />
        <KPI label="Ticket Médio" value={formatBRL(data.ticket_medio)} icon={Receipt} />
      </div>

      {/* ========== FATURAMENTO COMBINADO (Bar + Portaria) ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-display text-xl font-bold text-zinc-100">💰 Faturamento por Forma de Pagamento</h3>
            {portaria && <span className="text-[9px] sm:text-[10px] uppercase tracking-normal sm:tracking-widest text-[#D4AF37]">Balcão + Portaria</span>}
          </div>
          <div className="space-y-3">
            {Object.entries(methodKey).map(([k, label]) => {
              const bar = Number(data.totals[k] || 0);
              const port = Number(portaria?.totals?.[k] || 0);
              const total = combined[k];
              const pct = totalNoite ? (total / totalNoite) * 100 : 0;
              return (
                <div key={k}>
                  <div className="flex flex-wrap justify-between gap-1 text-sm mb-1 min-w-0">
                    <span className="text-zinc-300">{label}</span>
                    <span className="mono text-zinc-100 font-bold break-words [overflow-wrap:anywhere]">{formatBRL(total)}</span>
                  </div>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#D4AF37]" style={{ width: `${totalNoite ? (bar / totalNoite) * 100 : 0}%` }} title={`Balcão ${formatBRL(bar)}`} />
                    <div className="h-full bg-purple-500" style={{ width: `${totalNoite ? (port / totalNoite) * 100 : 0}%` }} title={`Portaria ${formatBRL(port)}`} />
                  </div>
                  {portaria && (bar > 0 || port > 0) && (
                    <div className="flex flex-wrap justify-between gap-1 text-[10px] mt-0.5 text-zinc-500">
                      <span>Balcão <span className="mono text-zinc-400">{formatBRL(bar)}</span></span>
                      <span>Portaria <span className="mono text-zinc-400">{formatBRL(port)}</span></span>
                    </div>
                  )}
                </div>
              );
            })}
            {tefTotal > 0 && (
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">TEF/POS (Balcão)</span>
                  <span className="mono text-zinc-100">{formatBRL(tefTotal)}</span>
                </div>
              </div>
            )}
          </div>
          {portaria && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#D4AF37]" /> Balcão</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500" /> Portaria</span>
            </div>
          )}
        </div>

        <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
          <h3 className="font-display text-xl font-bold mb-4 text-zinc-100">Caixas · Balcão</h3>
          <div className="space-y-3">
            {data.by_cashier.map((c) => (
              <button type="button" key={c.id} onClick={() => setSelectedCash({ type: "balcao", id: c.id })} className="w-full min-w-0 text-left flex flex-wrap items-center justify-between gap-2 p-3 bg-[#18181D] hover:bg-[#24242B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded-lg transition" aria-label={`Ver resumo do ${c.name}`}>
                <span className="text-zinc-200">{c.name}</span>
                <span className="mono text-[#D4AF37] font-bold">{formatBRL(c.total)}</span>
              </button>
            ))}
          </div>
          {portaria && (
            <>
              <h3 className="font-display text-lg font-bold mt-5 mb-3 text-zinc-100 flex items-center gap-2">
                <DoorOpen size={16} className="text-[#D4AF37]" /> Caixa · Portaria
                <Link to="/portaria" className="ml-auto text-xs text-[#D4AF37] hover:underline">abrir</Link>
              </h3>
              <button type="button" onClick={() => setSelectedCash({ type: "portaria" })} className="w-full text-left p-3 bg-[#18181D] hover:bg-[#24242B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded-lg transition" aria-label="Ver resumo do Caixa Portaria">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200">{portaria.cash?.opened_by_name || "Sem caixa aberto"}</span>
                  <span className="mono text-[#D4AF37] font-bold">{formatBRL(portTotal)}</span>
                </div>
                {portaria.cash && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {portaria.cash_status === "open" ? <span className="text-emerald-400">🟢 Aberto</span> : <span className="text-red-400">🔴 Fechado</span>}
                  </p>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {cashDetails && (
        <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedCash(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="cash-summary-title" className="w-full max-w-md bg-[#121215] border border-[#D4AF37]/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div><p className="text-xs uppercase tracking-widest text-[#D4AF37]">Resumo do caixa · Hoje</p><h2 id="cash-summary-title" className="text-2xl font-bold text-white mt-1">{cashDetails.name}</h2></div>
              <button type="button" onClick={() => setSelectedCash(null)} aria-label="Fechar resumo" className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"><X size={22} /></button>
            </div>
            <div className="min-w-0 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-4 mb-5"><p className="text-zinc-300 text-sm">Total geral</p><p className="text-[#D4AF37] text-xl sm:text-3xl font-bold mono break-words [overflow-wrap:anywhere]">{formatBRL(cashDetails.total || 0)}</p></div>
            <div className="space-y-3">
              {[['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['credito', 'Cartão de crédito'], ['debito', 'Cartão de débito'], ['tef', 'TEF/POS']].filter(([key]) => key !== 'tef' || Number(cashDetails.totals?.tef || 0) > 0).map(([key, label]) => (
                <div key={key} className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-white/10"><span className="text-zinc-300">{label}</span><strong className="mono text-white break-words [overflow-wrap:anywhere]">{formatBRL(cashDetails.totals?.[key] || 0)}</strong></div>
              ))}
            </div>
            <p className="text-zinc-500 text-xs mt-5">Valores registrados no sistema para o período exibido no Dashboard. Não inclui sangrias como vendas.</p>
            <button type="button" onClick={() => setSelectedCash(null)} className="w-full mt-5 rounded-xl bg-[#D4AF37] text-black font-bold py-3">Fechar</button>
          </div>
        </div>
      )}

      {/* ========== TOP PRODUTOS ========== */}
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-[#D4AF37]" size={20} />
          <h3 className="font-display text-xl font-bold text-zinc-100">Produtos Mais Vendidos</h3>
        </div>
        <div className="space-y-2">
          {data.top_products.length === 0 && <p className="text-zinc-500 text-sm">Nenhuma venda registrada hoje.</p>}
          {data.top_products.map((p, i) => (
            <div key={p.product_id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#18181D] rounded-lg min-w-0">
              <div className="flex items-center gap-3">
                <span className="mono text-sm text-[#D4AF37] w-6">#{i + 1}</span>
                <span className="text-zinc-200 min-w-0 break-words [overflow-wrap:anywhere]">{p.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-6 min-w-0">
                <span className="mono text-sm text-zinc-400">{p.qty}x</span>
                <span className="mono text-zinc-100 break-words [overflow-wrap:anywhere]">{formatBRL(p.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon }) {
  return (
    <div className="relative min-w-0 bg-[#121215] border border-white/5 rounded-2xl p-4 sm:p-6 overflow-hidden gold-ring-hover transition">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="mono text-[clamp(1.15rem,5.5vw,1.875rem)] sm:text-3xl leading-tight font-bold mt-2 text-zinc-100 break-words [overflow-wrap:anywhere]">{value}</p>
        </div>
        <Icon className="text-[#D4AF37] shrink-0" size={28} />
      </div>
    </div>
  );
}

function PeopleCard({ label, value, color }) {
  const styles = {
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-100",
    pink: "bg-pink-500/10 border-pink-500/40 text-pink-100",
    gold: "bg-[#D4AF37]/10 border-[#D4AF37]/50 gold-text",
  };
  const labelColor = {
    blue: "text-blue-300",
    pink: "text-pink-300",
    gold: "text-[#D4AF37]",
  };
  return (
    <div className={`border rounded-xl p-3 text-center min-w-[90px] ${styles[color]}`}>
      <p className={`text-[10px] uppercase tracking-widest ${labelColor[color]}`}>{label}</p>
      <p className="mono text-[clamp(0.9rem,3.7vw,1.875rem)] sm:text-3xl leading-tight font-bold mt-1 break-words [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}
