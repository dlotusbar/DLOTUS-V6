import { useEffect, useState } from "react";
import api, { formatBRL, formatDate } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { UserPlus, DoorOpen, Users, Settings, History, Wallet, Moon, Lock, Unlock, X, CheckCircle2, Search, AlertTriangle, Printer } from "lucide-react";
import { silentPrintCashClose, pickCaixaPrinter, isDesktop } from "../lib/desktopPrint";

const TABS = [
  { id: "cobrar", label: "Cobrar Entrada", icon: DoorOpen, perm: "portaria" },
  { id: "clientes", label: "Clientes", icon: Users, perm: "portaria" },
  { id: "maioridade", label: "Verificação de Maioridade", icon: CheckCircle2, perm: "portaria" },
  { id: "caixa", label: "Caixa", icon: Wallet, perm: "portaria_caixa" },
  { id: "noturna", label: "Visão Noturna", icon: Moon, perm: "portaria" },
  { id: "historico", label: "Histórico", icon: History, perm: "portaria" },
  { id: "config", label: "Configurações", icon: Settings, perm: "portaria_config" },
];

export default function Portaria() {
  const { can } = useAuth();
  const visible = TABS.filter((t) => can(t.perm));
  const [tab, setTab] = useState(visible[0]?.id || "cobrar");

  return (
    <div className="p-6 lg:p-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-purple-500/20 border border-[#D4AF37]/30">
          <DoorOpen className="text-[#D4AF37]" size={28} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Módulo</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold gold-text">Portaria</h1>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 border-b border-white/5">
        {visible.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              data-testid={`portaria-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-t-lg text-sm whitespace-nowrap flex items-center gap-2 transition ${tab === t.id ? "bg-[#D4AF37]/15 text-[#F3E5AB] border-b-2 border-[#D4AF37]" : "text-zinc-400 hover:text-zinc-100"}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "cobrar" && <CobrarEntrada />}
      {tab === "clientes" && <Clientes />}
      {tab === "maioridade" && <VerificacaoMaioridade />}
      {tab === "caixa" && <CaixaPortaria />}
      {tab === "noturna" && <VisaoNoturna />}
      {tab === "historico" && <Historico />}
      {tab === "config" && <ConfigPortaria />}
    </div>
  );
}

// ========== Cobrar Entrada ==========
function CobrarEntrada() {
  const [config, setConfig] = useState(null);
  const [homens, setHomens] = useState(0);
  const [mulheres, setMulheres] = useState(0);
  const [method, setMethod] = useState(null);
  const [clientName, setClientName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [cash, setCash] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    api.get("/portaria/config").then((r) => setConfig(r.data)).catch(() => toast.error("Não foi possível carregar os preços da portaria"));
    api.get("/portaria/cash/current").then((r) => setCash(r.data)).catch(() => toast.error("Não foi possível verificar o caixa"));
  }, []);

  const count = homens + mulheres;
  const amount = config ? homens * config.price_homem + mulheres * config.price_mulher : 0;
  const ready = count > 0 && method && config && cash?.status === "open";
  const changeCount = (type, delta) => {
    if (confirming) return;
    setPendingId(null);
    if (type === "homem") setHomens((v) => Math.max(0, v + delta));
    else setMulheres((v) => Math.max(0, v + delta));
  };
  const submit = async () => {
    if (!ready || confirming) return;
    setConfirming(true);
    // Reuse the same ID when retrying after a network failure to avoid duplicate charges.
    const id = pendingId || (window.crypto?.randomUUID?.() || `grupo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setPendingId(id);
    try {
      const { data } = await api.post("/portaria/entries/group", {
        id, homens, mulheres, payment_method: method, client_name: clientName
      });
      toast.success(`✅ ${data.total_pessoas} entradas registradas — ${formatBRL(data.amount)}`);
      setLastEntry(data);
      setHomens(0); setMulheres(0); setMethod(null); setClientName(""); setPendingId(null);
      api.get("/portaria/cash/current").then((r) => setCash(r.data)).catch(() => {});
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível confirmar. Confira a conexão antes de tentar novamente.");
    } finally { setConfirming(false); }
  };

  if (!cash || cash.status !== "open") {
    return (
      <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-400 mb-3" size={40} />
        <h3 className="font-display text-xl font-bold text-amber-100 mb-2">Caixa fechado</h3>
        <p className="text-zinc-400 text-sm">Abra o caixa da portaria antes de registrar entradas.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-3">1 · Adicione as pessoas do grupo</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[["homem", "👨", "Homem", homens, config?.price_homem], ["mulher", "👩", "Mulher", mulheres, config?.price_mulher]].map(([type, emoji, label, qty, price]) => (
            <div key={type} className={`rounded-xl border-2 p-3 text-center ${type === "homem" ? "bg-blue-500/10 border-blue-500/30" : "bg-pink-500/10 border-pink-500/30"}`}>
              <button type="button" disabled={confirming} data-testid={`gender-${type}`} onClick={() => changeCount(type, 1)} className="w-full rounded-lg py-3 hover:bg-white/5 disabled:opacity-50" aria-label={`Adicionar ${label}`}>
                <div className="text-4xl">{emoji}</div>
                <div className="font-display text-lg font-bold text-zinc-100">{label}</div>
                <div className="mono text-sm text-zinc-400">{config ? formatBRL(price) : "Carregando preço"}</div>
                <div className="text-4xl font-bold text-white mt-2" data-testid={`count-${type}`}>{qty}</div>
                <div className="text-xs text-[#D4AF37]">Toque para adicionar +1</div>
              </button>
              <button type="button" disabled={qty === 0 || confirming} onClick={() => changeCount(type, -1)} className="mt-2 w-full rounded-lg border border-white/20 py-2 text-zinc-200 disabled:opacity-30" aria-label={`Remover um ${label}`}>− Remover 1</button>
            </div>
          ))}
        </div>
        <button type="button" disabled={count === 0 || confirming} onClick={() => { setHomens(0); setMulheres(0); setPendingId(null); }} className="mb-6 text-sm text-zinc-400 underline disabled:opacity-30">Limpar contagem</button>
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-3">2 · Forma de pagamento do grupo</p>
        <div className="grid grid-cols-2 gap-2">
          {[["dinheiro", "Dinheiro"], ["pix", "Pix"], ["credito", "Crédito"], ["debito", "Débito"]].map(([k, l]) => (
            <button key={k} disabled={confirming} data-testid={`method-${k}`} onClick={() => { setMethod(k); setPendingId(null); }} className={`py-3 rounded-lg border transition font-medium ${method === k ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#F3E5AB]" : "bg-[#18181D] border-white/10 text-zinc-300 hover:border-[#D4AF37]/40"}`}>{l}</button>
          ))}
        </div>
        <div className="mt-5">
          <label className="text-xs uppercase tracking-widest text-zinc-400">Identificação do grupo (opcional)</label>
          <input value={clientName} disabled={confirming} onChange={(e) => { setClientName(e.target.value); setPendingId(null); }} data-testid="entry-client-name" className="w-full mt-2 px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100" placeholder="Nome ou identificação" />
        </div>
      </div>
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-6 flex flex-col">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Resumo da cobrança</p>
        <div className="flex-1 flex flex-col justify-center py-6 gap-3">
          <div className="flex justify-between text-zinc-300"><span>👨 Homens: {homens}</span><span>{formatBRL(homens * (config?.price_homem || 0))}</span></div>
          <div className="flex justify-between text-zinc-300"><span>👩 Mulheres: {mulheres}</span><span>{formatBRL(mulheres * (config?.price_mulher || 0))}</span></div>
          <div className="border-t border-white/10 pt-3 flex justify-between text-lg font-bold"><span>Total de pessoas</span><span data-testid="entry-total-people">{count}</span></div>
          <div className="text-sm text-zinc-500 text-center mt-4">Valor total a cobrar</div>
          <div className="mono text-5xl font-bold gold-text text-center" data-testid="entry-total-amount">{formatBRL(amount)}</div>
          <div className="text-center text-sm text-[#D4AF37]">{method ? method.toUpperCase() : "Selecione o pagamento"}</div>
        </div>
        <button onClick={submit} disabled={!ready || confirming} data-testid="confirm-entry" className="w-full py-5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] text-black font-bold text-lg rounded-xl disabled:opacity-30 hover:opacity-90 transition">
          {confirming ? "Registrando grupo..." : `✓ CONFIRMAR ${count} ${count === 1 ? "ENTRADA" : "ENTRADAS"}`}
        </button>
        {lastEntry && (
          <div className="mt-4 bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 text-sm">
            <CheckCircle2 className="inline text-emerald-400 mr-2" size={14} />
            Último grupo: {lastEntry.homens} homens, {lastEntry.mulheres} mulheres · {formatBRL(lastEntry.amount)} · {lastEntry.payment_method}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Clientes ==========
function Clientes() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", cpf: "", phone: "", address: "" });
  const [history, setHistory] = useState(null);

  const load = () => api.get(`/portaria/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => setList(r.data));
  useEffect(() => { load(); }, [q]);

  const save = async () => {
    if (!form.name) return toast.error("Nome obrigatório");
    try { await api.post("/portaria/clients", form); toast.success("Cliente cadastrado"); setForm({ name: "", cpf: "", phone: "", address: "" }); load(); } catch (e) { toast.error("Erro"); }
  };
  const showHistory = async (c) => { const { data } = await api.get(`/portaria/clients/${c.id}/history`); setHistory({ client: c, entries: data }); };

  return (
    <div className="space-y-6">
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5">
        <h3 className="font-display text-lg font-bold mb-3">Cadastrar Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="client-name" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
          <input placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} data-testid="client-cpf" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg mono" />
          <input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="client-phone" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg mono" />
          <input placeholder="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
        </div>
        <button onClick={save} data-testid="save-client" className="mt-3 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg">Cadastrar</button>
      </div>

      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5">
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="client-search" placeholder="Pesquisar por nome, CPF ou telefone..." className="w-full pl-10 pr-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
        </div>
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x" tabIndex={0} aria-label="Tabela com rolagem horizontal"><table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-zinc-400"><tr><th className="text-left pb-2">Nome</th><th className="text-left pb-2">CPF</th><th className="text-left pb-2">Telefone</th><th className="text-right pb-2">Entradas</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} onClick={() => showHistory(c)} className="border-t border-white/5 hover:bg-white/5 cursor-pointer">
                <td className="py-2 text-zinc-100">{c.name}</td>
                <td className="py-2 mono text-zinc-400">{c.cpf || "-"}</td>
                <td className="py-2 mono text-zinc-400">{c.phone || "-"}</td>
                <td className="py-2 text-right text-[#D4AF37] mono">{c.entries_count}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {list.length === 0 && <p className="text-sm text-zinc-500 py-4">Nenhum cliente.</p>}
      </div>

      {history && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setHistory(null)}>
          <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-zinc-100 mb-1">{history.client.name}</h3>
            <p className="text-xs text-zinc-500 mb-4">Histórico de entradas</p>
            {history.entries.length === 0 && <p className="text-sm text-zinc-500">Sem entradas.</p>}
            {history.entries.map((e) => (
              <div key={e.id} className="flex justify-between py-2 border-b border-white/5 text-sm">
                <span className="text-zinc-300">{formatDate(e.created_at)} · {e.gender}</span>
                <span className="mono text-[#D4AF37]">{formatBRL(e.amount)} ({e.payment_method})</span>
              </div>
            ))}
            <button onClick={() => setHistory(null)} className="w-full mt-4 py-2 bg-[#18181D] rounded-lg">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Caixa Portaria ==========
function CaixaPortaria() {
  const { user, can } = useAuth();
  const [current, setCurrent] = useState(null);
  const [initial, setInitial] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [closedReport, setClosedReport] = useState(null);
  const [sangriaAmount, setSangriaAmount] = useState("");
  const [sangriaReason, setSangriaReason] = useState("");
  const [sangriaModal, setSangriaModal] = useState(false);
  const [sangriaBusy, setSangriaBusy] = useState(false);


  const load = () => api.get("/portaria/cash/current").then((r) => setCurrent(r.data));
  useEffect(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, []);

  const openCash = async () => {
    const v = Number(initial || 0);
    if (v < 0) return toast.error("Valor inválido");
    if (v === 0 && !window.confirm("Abrir caixa sem troco inicial?")) return;
    try {
      await api.post("/portaria/cash/open", { initial_amount: v });
      toast.success(`Caixa aberto com troco de ${formatBRL(v)}`);
      setInitial("");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  if (closedReport) return <PortariaThermalReport report={closedReport} onDismiss={() => setClosedReport(null)} />;
  if (!current) return <p className="text-zinc-500">Carregando...</p>;

  if (current.status !== "open") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-[#D4AF37]/10 via-[#121215] to-purple-900/20 border-2 border-[#D4AF37]/40 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40">
              <Lock className="text-[#D4AF37]" size={28} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#D4AF37]">Caixa da Portaria</p>
              <h3 className="font-display text-2xl font-bold text-zinc-100">Nenhum caixa aberto</h3>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-6">
            Antes de registrar entradas, você precisa abrir o caixa. Informe o <strong className="text-[#D4AF37]">troco inicial em dinheiro</strong> que está disponível no caixa físico para dar troco aos clientes durante a noite.
          </p>

          <div className="bg-[#0A0A0C] rounded-xl p-5 border border-white/10">
            <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-3 font-bold">💵 Troco Inicial</label>
            <div className="flex gap-2 items-stretch">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-[#D4AF37] font-bold mono">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initial}
                  onChange={(e) => setInitial(e.target.value)}
                  data-testid="open-cash-initial"
                  placeholder="0,00"
                  autoFocus
                  className="w-full pl-16 pr-4 py-4 bg-[#121215] border-2 border-[#D4AF37]/40 rounded-xl text-2xl font-bold text-zinc-100 mono focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[50, 100, 150, 200, 300, 500].map((v) => (
                <button key={v} onClick={() => setInitial(String(v))} className="px-3 py-1.5 bg-[#18181D] hover:bg-[#D4AF37]/15 hover:text-[#D4AF37] text-zinc-300 rounded-lg text-sm mono transition">
                  R$ {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={openCash}
            data-testid="open-cash-btn"
            className="w-full mt-5 py-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] text-black font-bold text-lg rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Unlock size={18} /> ABRIR CAIXA DA PORTARIA
          </button>

          <div className="mt-4 flex items-start gap-2 text-xs text-zinc-500 bg-amber-950/20 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p>O valor informado será somado às vendas em dinheiro ao fechar o caixa. Caso não haja troco inicial, pode informar <strong>R$ 0,00</strong>.</p>
          </div>
        </div>
      </div>
    );
  }

  const c = current.cash;
  const t = current.totals;
  return (
    <div className="space-y-5">
      <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2"><Unlock className="text-emerald-400" size={18} /><span className="text-xs uppercase tracking-widest text-emerald-400">Caixa Aberto</span></div>
            <h3 className="font-display text-2xl font-bold mt-1 text-zinc-100">{c.opened_by_name}</h3>
            <p className="text-sm text-zinc-400 mono">Desde {formatDate(c.opened_at)} · Troco inicial: <span className="text-[#D4AF37] font-bold">{formatBRL(c.initial_amount)}</span></p>
          </div>
          <div className="flex gap-2"><button onClick={() => setSangriaModal(true)} className="px-5 py-3 bg-amber-950/40 text-amber-300 font-bold rounded-lg">💵 Sangria</button><button onClick={() => setShowClose(true)} data-testid="close-cash-btn" className="px-5 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-black font-bold rounded-lg">🔒 Fechar Caixa</button></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="👨 Homens" value={t.homens} />
        <StatCard label="👩 Mulheres" value={t.mulheres} />
        <StatCard label="👥 Pessoas" value={t.total_pessoas} />
        <StatCard label="💵 Total" value={formatBRL(t.total)} gold />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(t.totals).map(([k, v]) => <StatCard key={k} label={k.toUpperCase()} value={formatBRL(v)} />)}
      </div>

      {sangriaModal && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><div className="bg-[#121215] border border-[#D4AF37]/40 rounded-xl p-6 w-full max-w-md space-y-4"><h3 className="text-xl font-bold text-[#D4AF37]">Sangria — Portaria</h3><label className="block text-sm">Valor (R$)<input type="number" min="0.01" step="0.01" value={sangriaAmount} onChange={e => setSangriaAmount(e.target.value)} className="block w-full bg-[#09090b] border border-white/20 rounded p-3 mt-1" /></label><label className="block text-sm">Motivo<input value={sangriaReason} onChange={e => setSangriaReason(e.target.value)} className="block w-full bg-[#09090b] border border-white/20 rounded p-3 mt-1" /></label><div className="flex gap-3"><button className="flex-1 p-3 bg-zinc-800 rounded" onClick={() => setSangriaModal(false)}>Cancelar</button><button disabled={sangriaBusy || !Number(sangriaAmount) || !sangriaReason.trim()} className="flex-1 p-3 bg-[#D4AF37] text-black rounded font-bold disabled:opacity-50" onClick={async () => { setSangriaBusy(true); try { await api.post(`/sangrias/portaria/${c.id}`, { amount: Number(sangriaAmount), reason: sangriaReason, request_id: crypto.randomUUID() }); toast.success("Sangria registrada"); setSangriaModal(false); setSangriaAmount(""); setSangriaReason(""); load(); } catch (e) { toast.error(e.response?.data?.detail || "Erro na sangria"); } finally { setSangriaBusy(false); } }}>Confirmar</button></div></div></div>}
      {showClose && <CloseModal cash={c} totals={t} onClose={() => setShowClose(false)} onDone={(report) => { setShowClose(false); setClosedReport(report); load(); }} />}
    </div>
  );
}

function StatCard({ label, value, gold }) {
  return (
    <div className={`bg-[#121215] border rounded-xl p-4 ${gold ? "border-[#D4AF37]/40" : "border-white/5"}`}>
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mono text-2xl font-bold mt-1 ${gold ? "gold-text" : "text-zinc-100"}`}>{value}</p>
    </div>
  );
}

function CloseModal({ cash, totals, onClose, onDone }) {
  const [sangrias, setSangrias] = useState({ items: [], total: 0 });
  useEffect(() => { api.get(`/sangrias/portaria/${cash.id}`).then(r => setSangrias(r.data)).catch(() => {}); }, [cash.id]);
  const expected = { ...totals.totals, dinheiro: Number((totals.totals.dinheiro + (cash.initial_amount || 0) - sangrias.total).toFixed(2)) };
  const [counted, setCounted] = useState({ dinheiro: expected.dinheiro, pix: expected.pix, credito: expected.credito, debito: expected.debito });
  const [notes, setNotes] = useState("");

  const diffs = Object.fromEntries(Object.keys(expected).map((k) => [k, Number((counted[k] - expected[k]).toFixed(2))]));
  const totalDiff = Object.values(diffs).reduce((s, v) => s + v, 0);

  const confirm = async () => {
    try {
      const { data: res } = await api.post(`/portaria/cash/${cash.id}/close`, {
        counted_dinheiro: Number(counted.dinheiro),
        counted_pix: Number(counted.pix),
        counted_credito: Number(counted.credito),
        counted_debito: Number(counted.debito),
        notes,
      });
      toast.success("Caixa fechado");
      // A confirmação grava no banco; o relatório permanece aberto até o usuário sair.
      // A impressão é uma ação explícita para permitir conferência e reimpressão.
      const sales = { ...totals.totals };
      onDone({
        ...res,
        name: "Caixa Portaria",
        opened_at: res.opened_at || cash.opened_at,
        closed_at: res.closed_at,
        opened_by_name: res.opened_by_name || cash.opened_by_name,
        sales_by_method: sales,
        total_sales: totals.total,
        total_pessoas: totals.total_pessoas,
        homens: totals.homens,
        mulheres: totals.mulheres,
        valor_homens: totals.valor_homens,
        valor_mulheres: totals.valor_mulheres,
      });
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-6 max-w-2xl w-full my-8">
        <h3 className="font-display text-2xl font-bold gold-text mb-1">Fechamento de Caixa — Portaria</h3>
        <p className="text-sm text-zinc-500 mb-5">{cash.opened_by_name} · {formatDate(cash.opened_at)}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          <StatCard label="Homens" value={`${totals.homens} · ${formatBRL(totals.valor_homens ?? 0)}`} />
          <StatCard label="Mulheres" value={`${totals.mulheres} · ${formatBRL(totals.valor_mulheres ?? 0)}`} />
          <StatCard label="Total" value={totals.total_pessoas} />
          <StatCard label="Arrecadado" value={formatBRL(totals.total)} gold />
        </div>

        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-5 gap-2 text-xs uppercase tracking-widest text-zinc-500 px-2">
            <span>Forma</span><span className="text-right col-span-1">Esperado</span><span className="text-right col-span-1">Contado</span><span className="text-right col-span-1">Dif.</span><span></span>
          </div>
          {["dinheiro", "pix", "credito", "debito"].map((k) => (
            <div key={k} className="grid grid-cols-5 gap-2 items-center bg-[#0A0A0C] rounded-lg p-2">
              <span className="capitalize text-zinc-200">{k}</span>
              <span className="mono text-right text-zinc-400">{formatBRL(expected[k])}</span>
              <input type="number" step="0.01" value={counted[k]} data-testid={`counted-${k}`} onChange={(e) => setCounted({ ...counted, [k]: e.target.value })} className="px-2 py-1 bg-[#121215] border border-white/10 rounded mono text-right text-zinc-100" />
              <span className={`mono text-right ${diffs[k] === 0 ? "text-emerald-400" : diffs[k] > 0 ? "text-blue-400" : "text-red-400"}`}>{formatBRL(diffs[k])}</span>
              <span className="text-xs text-zinc-500">{diffs[k] === 0 ? "OK" : diffs[k] > 0 ? "sobra" : "falta"}</span>
            </div>
          ))}
        </div>

        <div className="bg-[#0A0A0C] rounded-lg p-3 mb-4"><div className="flex justify-between text-amber-300 font-bold"><span>Sangrias ({sangrias.items.length})</span><span>- {formatBRL(sangrias.total)}</span></div>{sangrias.items.map(s => <div key={s.id} className="flex justify-between text-xs text-zinc-400"><span>{s.reason} · {s.created_by_name}</span><span>{formatBRL(s.amount)}</span></div>)}
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Total esperado</span><span className="mono text-zinc-100">{formatBRL(Object.values(expected).reduce((s, v) => s + v, 0))}</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Total contado</span><span className="mono text-zinc-100">{formatBRL(Object.values(counted).reduce((s, v) => s + Number(v), 0))}</span></div>
          <div className="flex justify-between text-lg mt-1"><span className="text-zinc-200 font-bold">Diferença</span><span className={`mono font-bold ${totalDiff === 0 ? "text-emerald-400" : totalDiff > 0 ? "text-blue-400" : "text-red-400"}`}>{formatBRL(totalDiff)}</span></div>
        </div>

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações do fechamento (opcional)" className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mb-4" rows="2" />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 bg-[#18181D] rounded-lg text-zinc-300">Cancelar</button>
          <button onClick={confirm} data-testid="confirm-close-cash" className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-black font-bold rounded-lg">Confirmar Fechamento</button>
        </div>
      </div>
    </div>
  );
}

// Relatório visível após fechar a Portaria; o fechamento já está persistido no servidor.
function PortariaThermalReport({ report, onDismiss }) {
  const [printing, setPrinting] = useState(false);
  const methods = report.sales_by_method || {};
  const cash = Number(methods.dinheiro || 0);
  const pix = Number(methods.pix || 0);
  const credito = Number(methods.credito || 0);
  const debito = Number(methods.debito || 0);
  const total = Number(report.total_sales ?? (cash + pix + credito + debito));
  const print = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      if (isDesktop()) {
        const { data: printers } = await api.get("/printers");
        const p = pickCaixaPrinter(printers);
        if (!p?.windows_printer_name) throw new Error("Configure a impressora térmica do Caixa nas configurações.");
        const result = await silentPrintCashClose(p.windows_printer_name, {
          opened_at: report.opened_at, closed_at: report.closed_at,
          opened_by_name: report.opened_by_name, closed_by_name: report.closed_by_name,
          initial_change: report.initial_amount || 0, sales_by_method: methods,
          total_sales: total, total_pessoas: report.total_pessoas,
          homens: report.homens, mulheres: report.mulheres,
          valor_homens: report.valor_homens, valor_mulheres: report.valor_mulheres,
          sangrias_total: report.sangrias_total || 0,
          expected_cash: report.expected?.dinheiro,
          expected: report.expected, counted: report.counted,
        }, { title: "FECHAMENTO PORTARIA", subtitle: "Caixa Portaria" });
        if (!result?.ok) throw new Error(result?.error || "Impressão não confirmada");
        toast.success("Relatório enviado à impressora");
      } else {
        // Imprime somente o cupom, sem menus, em papel de 80 mm.
        const content = document.getElementById("portaria-cupom-80mm")?.innerHTML;
        if (!content) throw new Error("Relatório indisponível");
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
        document.body.appendChild(frame);
        const doc = frame.contentDocument;
        doc.open();
        doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:80mm auto;margin:0}html,body{margin:0;padding:0;background:white;color:black;font:12px Arial,sans-serif}.receipt{box-sizing:border-box;width:80mm;padding:4mm;overflow-wrap:anywhere}.receipt *{color:black!important;background:white!important;border-color:black!important;box-shadow:none!important}.receipt h2{text-align:center;font-size:16px;margin:0 0 5px}.receipt h3{text-align:center;font-size:12px;margin:0 0 10px}.receipt .line{display:flex;justify-content:space-between;gap:6px;padding:3px 0}.receipt .line span:last-child{text-align:right}.receipt hr{border:0;border-top:1px dashed black;margin:9px 0}.receipt .strong{font-weight:700}.receipt .big{font-size:15px}</style></head><body><div class="receipt">${content}</div></body></html>`);
        doc.close();
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 60000);
      }
    } catch (e) { toast.error(e.message || "Falha na impressão"); }
    finally { setPrinting(false); }
  };
  const Line = ({ label, value, strong = false }) => <div className={`line flex justify-between gap-4 py-1 ${strong ? "strong font-bold" : ""}`}><span>{label}</span><span className="text-right">{value}</span></div>;
  return <div className="max-w-xl mx-auto space-y-4">
    <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-4 text-emerald-300 font-semibold">✓ Caixa da Portaria fechado. Relatório disponível para impressão.</div>
    <div id="portaria-cupom-80mm" className="mx-auto bg-white text-black rounded-md p-5 shadow-lg" style={{maxWidth:"80mm",fontFamily:"Arial, sans-serif",fontSize:12}}>
      <h2 className="text-center text-base font-black">D'LOTUS LOUNGE BAR</h2>
      <h3 className="text-center font-bold mb-3">FECHAMENTO DE CAIXA - PORTARIA</h3>
      <hr className="border-dashed border-black my-2" />
      <Line label="Caixa" value={report.name || "Caixa Portaria"} />
      <Line label="Operador" value={report.opened_by_name || "-"} />
      <Line label="Abertura" value={formatDate(report.opened_at)} />
      <Line label="Fechamento" value={formatDate(report.closed_at)} />
      <hr className="border-dashed border-black my-2" />
      <Line label={`Homens (${report.homens ?? 0})`} value={formatBRL(report.valor_homens ?? 0)} />
      <Line label={`Mulheres (${report.mulheres ?? 0})`} value={formatBRL(report.valor_mulheres ?? 0)} />
      <Line label="Total de pessoas" value={String(report.total_pessoas ?? 0)} strong />
      <Line label="Total portaria" value={formatBRL((report.valor_homens ?? 0) + (report.valor_mulheres ?? 0))} strong />
      <hr className="border-dashed border-black my-2" />
      <Line label="Dinheiro" value={formatBRL(cash)} />
      <Line label="PIX" value={formatBRL(pix)} />
      <Line label="Cartão (crédito)" value={formatBRL(credito)} />
      <Line label="Cartão (débito)" value={formatBRL(debito)} />
      <hr className="border-dashed border-black my-2" />
      <div className="big text-base"><Line label="TOTAL DE VENDAS" value={formatBRL(total)} strong /></div>
      <hr className="border-dashed border-black my-2" />
      <Line label="Sangrias" value={formatBRL(report.sangrias_total || 0)} />
      <Line label="Troco inicial" value={formatBRL(report.initial_amount || 0)} />
      <Line label="Dinheiro esperado" value={formatBRL(report.expected?.dinheiro || 0)} />
      <Line label="Dinheiro contado" value={formatBRL(report.counted?.dinheiro || 0)} />
      <Line label="Diferença" value={formatBRL(report.differences?.dinheiro || 0)} strong />
      <p className="text-center mt-4 text-xs">Fechamento registrado no sistema</p>
    </div>
    <div className="flex gap-3 flex-wrap">
      <button type="button" disabled={printing} onClick={print} className="flex-1 min-w-40 flex items-center justify-center gap-2 bg-white text-black font-bold rounded-lg p-3 disabled:opacity-50"><Printer size={18}/>{printing ? "Enviando..." : "Imprimir 80 mm"}</button>
      <button type="button" onClick={onDismiss} className="flex-1 min-w-40 rounded-lg p-3 bg-zinc-800 text-white">Voltar à Portaria</button>
    </div>
    <p className="text-xs text-zinc-400 text-center">O fechamento permanece salvo no Histórico da Portaria.</p>
  </div>;
}

// ========== Visão Noturna ==========
function VisaoNoturna() {
  const [data, setData] = useState(null);
  useEffect(() => { const l = () => api.get("/portaria/night-view").then((r) => setData(r.data)); l(); const i = setInterval(l, 3000); return () => clearInterval(i); }, []);
  if (!data) return <p className="text-zinc-500">Carregando...</p>;
  const totals = data.totals || { dinheiro: 0, pix: 0, credito: 0, debito: 0 };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigCard label="👨 HOMENS" value={data.homens} color="from-blue-500/20 to-blue-500/5 border-blue-500/40" />
        <BigCard label="👩 MULHERES" value={data.mulheres} color="from-pink-500/20 to-pink-500/5 border-pink-500/40" />
        <BigCard label="👥 TOTAL NA CASA" value={data.total_pessoas} color="from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/40" gold />
      </div>

      <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
        <h3 className="font-display text-xl font-bold mb-4 text-zinc-100">💰 Faturamento da Portaria</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Dinheiro" value={formatBRL(totals.dinheiro)} />
          <StatCard label="Pix" value={formatBRL(totals.pix)} />
          <StatCard label="Crédito" value={formatBRL(totals.credito)} />
          <StatCard label="Débito" value={formatBRL(totals.debito)} />
        </div>
        <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/30 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-[#D4AF37] mb-1">💵 Total Portaria</p>
          <p className="mono text-4xl font-bold gold-text">{formatBRL(data.total || 0)}</p>
        </div>
      </div>

      {data.cash && (
        <div className={`border rounded-2xl p-5 ${data.cash_status === "open" ? "bg-emerald-950/20 border-emerald-500/40" : "bg-zinc-950 border-white/10"}`}>
          <h3 className="font-display text-lg font-bold mb-2">💰 Caixa da Portaria</h3>
          <p className="text-sm">Status: {data.cash_status === "open" ? <span className="text-emerald-400">🟢 Aberto</span> : <span className="text-red-400">🔴 Fechado</span>}</p>
          <p className="text-sm text-zinc-400">Responsável: <span className="text-zinc-100">{data.cash.opened_by_name}</span></p>
          <p className="text-sm text-zinc-400 mono">Aberto em {formatDate(data.cash.opened_at)}</p>
        </div>
      )}
    </div>
  );
}

function BigCard({ label, value, color, gold }) {
  return (
    <div className={`bg-gradient-to-br ${color} border rounded-2xl p-6 text-center`}>
      <p className="text-sm uppercase tracking-widest text-zinc-300 mb-2">{label}</p>
      <p className={`mono text-6xl font-bold ${gold ? "gold-text" : "text-zinc-50"}`}>{value}</p>
    </div>
  );
}

// ========== Histórico ==========
function Historico() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const load = () => api.get("/portaria/cash/history").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const reopen = async (c) => {
    if (!window.confirm(`Reabrir caixa de ${c.opened_by_name}? Esta ação será auditada.`)) return;
    try { await api.post(`/portaria/cash/${c.id}/reopen`); toast.success("Caixa reaberto"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };
  const openDetail = async (c) => { const { data } = await api.get(`/portaria/cash/${c.id}`); setDetail(data); };

  const filtered = filter === "all" ? list : list.filter((c) => c.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["all", "open", "closed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs ${filter === f ? "bg-[#D4AF37] text-black font-bold" : "bg-[#18181D] text-zinc-400"}`}>{f === "all" ? "Todos" : f === "open" ? "Abertos" : "Fechados"}</button>
        ))}
      </div>
      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x" tabIndex={0} aria-label="Tabela com rolagem horizontal"><table className="w-full text-sm">
          <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
            <tr><th className="px-4 py-3 text-left">Abertura</th><th className="px-4 py-3 text-left">Fechamento</th><th className="px-4 py-3 text-left">Funcionário</th><th className="px-4 py-3 text-right">Pessoas</th><th className="px-4 py-3 text-right">Arrecadado</th><th className="px-4 py-3 text-right">Dif.</th><th className="px-4 py-3">Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const diff = c.differences ? Object.values(c.differences).reduce((s, v) => s + v, 0) : 0;
              return (
                <tr key={c.id} className="border-t border-white/5 cursor-pointer hover:bg-white/5" onClick={() => openDetail(c)}>
                  <td className="px-4 py-2 mono text-zinc-400">{formatDate(c.opened_at)}</td>
                  <td className="px-4 py-2 mono text-zinc-400">{c.closed_at ? formatDate(c.closed_at) : "—"}</td>
                  <td className="px-4 py-2 text-zinc-100">{c.opened_by_name}</td>
                  <td className="px-4 py-2 mono text-right">{c.total_pessoas ?? "-"}</td>
                  <td className="px-4 py-2 mono text-right text-[#D4AF37]">{formatBRL(c.total_arrecadado || 0)}</td>
                  <td className={`px-4 py-2 mono text-right ${diff === 0 ? "text-zinc-400" : diff > 0 ? "text-blue-400" : "text-red-400"}`}>{c.closed_at ? formatBRL(diff) : "-"}</td>
                  <td className="px-4 py-2 text-xs">{c.status === "open" ? <span className="text-emerald-400">● Aberto</span> : <span className="text-zinc-500">✓ Fechado</span>}</td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>{c.status === "closed" && user?.role === "Administrador" && <button onClick={() => reopen(c)} className="text-xs text-amber-400 hover:text-amber-300">Reabrir</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {filtered.length === 0 && <p className="p-6 text-center text-zinc-500">Nenhum caixa.</p>}
      </div>
      {detail && <DetailModal data={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailModal({ data, onClose }) {
  const c = data.cash; const t = data.totals;
  const printThermal = async () => {
    const { data: printers } = await api.get("/printers");
    const p = pickCaixaPrinter(printers);
    const report = {
      opened_at: c.opened_at,
      closed_at: c.closed_at,
      opened_by_name: c.opened_by_name,
      closed_by_name: c.closed_by_name,
      initial_change: c.initial_amount || 0,
      sales_by_method: t.totals,
      total_sales: t.total,
      total_pessoas: t.total_pessoas,
      homens: t.homens,
      mulheres: t.mulheres,
      valor_homens: t.valor_homens,
      valor_mulheres: t.valor_mulheres,
      expected_cash: (t.totals?.dinheiro || 0) + (c.initial_amount || 0),
      counted: c.counted,
      expected: c.expected,
    };
    if (isDesktop() && p && p.windows_printer_name) {
      const r = await silentPrintCashClose(p.windows_printer_name, report, { title: "FECHAMENTO · PORTARIA", subtitle: c.opened_by_name });
      if (r.ok) toast.success(`Impresso em ${p.windows_printer_name}`);
      else toast.error("Falha: " + (r.error || "erro"));
    } else {
      window.print();
    }
  };
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-6 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">D'Lotus Lounge Bar</p>
            <h3 className="font-display text-xl font-bold text-zinc-100">Fechamento de Portaria</h3>
          </div>
          <button onClick={printThermal} data-testid="print-portaria-report" className="px-3 py-1.5 bg-[#D4AF37]/15 text-[#D4AF37] rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-[#D4AF37]/25">
            <Printer size={12} /> Imprimir
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div><span className="text-zinc-500">Funcionário:</span> <span className="text-zinc-100">{c.opened_by_name}</span></div>
          <div><span className="text-zinc-500">Status:</span> <span className="text-zinc-100">{c.status}</span></div>
          <div><span className="text-zinc-500">Abertura:</span> <span className="mono text-zinc-100">{formatDate(c.opened_at)}</span></div>
          <div><span className="text-zinc-500">Fechamento:</span> <span className="mono text-zinc-100">{c.closed_at ? formatDate(c.closed_at) : "—"}</span></div>
          <div><span className="text-zinc-500">Homens:</span> <span className="text-zinc-100">{t.homens} · {formatBRL(t.valor_homens ?? 0)}</span></div>
          <div><span className="text-zinc-500">Mulheres:</span> <span className="text-zinc-100">{t.mulheres} · {formatBRL(t.valor_mulheres ?? 0)}</span></div>
          <div className="col-span-2"><span className="text-zinc-500">Total pessoas:</span> <span className="text-[#D4AF37] font-bold">{t.total_pessoas}</span></div>
        </div>
        <div className="bg-[#0A0A0C] rounded-lg p-3 space-y-1 text-sm mb-4">
          {Object.entries(t.totals).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-zinc-400 capitalize">{k}</span><span className="mono">{formatBRL(v)}</span></div>)}
          <div className="flex justify-between pt-2 border-t border-white/5 font-bold"><span>Total Arrecadado</span><span className="mono gold-text">{formatBRL(t.total)}</span></div>
        </div>
        {c.counted && (
          <div className="bg-[#0A0A0C] rounded-lg p-3 space-y-1 text-sm mb-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Conferência</div>
            {Object.keys(c.counted).map((k) => (
              <div key={k} className="flex justify-between text-xs"><span className="capitalize text-zinc-400">{k}</span><span className="mono">esp {formatBRL(c.expected[k])} · ct {formatBRL(c.counted[k])} · <span className={c.differences[k] === 0 ? "text-emerald-400" : c.differences[k] > 0 ? "text-blue-400" : "text-red-400"}>{formatBRL(c.differences[k])}</span></span></div>
            ))}
          </div>
        )}
        {c.notes && <div className="bg-[#0A0A0C] rounded-lg p-3 text-sm"><span className="text-zinc-500">Observações:</span> <span className="text-zinc-200">{c.notes}</span></div>}
      </div>
    </div>
  );
}

// ========== Config ==========
function ConfigPortaria() {
  const [config, setConfig] = useState(null);
  const [h, setH] = useState(""); const [m, setM] = useState("");
  useEffect(() => { api.get("/portaria/config").then((r) => { setConfig(r.data); setH(r.data.price_homem); setM(r.data.price_mulher); }); }, []);
  const save = async () => {
    try { const { data } = await api.put("/portaria/config", { price_homem: Number(h), price_mulher: Number(m) }); setConfig(data); toast.success("Valores atualizados"); } catch (e) { toast.error(e.response?.data?.detail || "Sem permissão"); }
  };
  if (!config) return null;
  return (
    <div className="bg-[#121215] border border-white/5 rounded-2xl p-6 max-w-lg">
      <h3 className="font-display text-xl font-bold mb-1">Valores de Entrada</h3>
      <p className="text-sm text-zinc-500 mb-5">Somente administradores podem alterar.</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-zinc-400">👨 Homem</label>
          <input type="number" step="0.01" value={h} onChange={(e) => setH(e.target.value)} data-testid="cfg-price-homem" className="w-full mt-2 px-3 py-3 bg-[#0A0A0C] border border-white/10 rounded-lg mono text-xl" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-zinc-400">👩 Mulher</label>
          <input type="number" step="0.01" value={m} onChange={(e) => setM(e.target.value)} data-testid="cfg-price-mulher" className="w-full mt-2 px-3 py-3 bg-[#0A0A0C] border border-white/10 rounded-lg mono text-xl" />
        </div>
        <button onClick={save} data-testid="save-cfg" className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-lg">Salvar</button>
      </div>
    </div>
  );
}


// Integração Unico: a tela não faz consultas reais sem contrato e backend homologado.
// Nunca enviar credenciais da Unico pelo navegador, nem aprovar acesso com simulações.
function VerificacaoMaioridade() {
  const [documento, setDocumento] = useState("");
  const [tipo, setTipo] = useState("cpf");
  const [dataNascimento, setDataNascimento] = useState("");
  const [conferido, setConferido] = useState(false);
  const [resultado, setResultado] = useState(null);
  const limpar = () => { setDocumento(""); setDataNascimento(""); setConferido(false); setResultado(null); };
  const consultar = () => {
    setResultado({ status: "indisponivel", mensagem: "Consulta Unico indisponível. Contrate e configure a API oficial no servidor antes de verificar identidades." });
  };
  const calcular = () => {
    if (!conferido || !dataNascimento) return;
    const partes = dataNascimento.split("-").map(Number);
    if (partes.length !== 3 || !partes[0]) return;
    const hoje = new Date();
    const nasc = new Date(partes[0], partes[1]-1, partes[2]);
    if (nasc.getFullYear() !== partes[0] || nasc.getMonth() !== partes[1]-1 || nasc.getDate() !== partes[2] || nasc > hoje) {
      setResultado({ status: "erro", mensagem: "Data de nascimento inválida." }); return;
    }
    let idade = hoje.getFullYear()-partes[0];
    if (hoje.getMonth()+1 < partes[1] || (hoje.getMonth()+1 === partes[1] && hoje.getDate() < partes[2])) idade--;
    setResultado({ status: "manual", mensagem: `${idade} anos — ${idade >= 18 ? "MAIOR" : "MENOR"} de 18 anos (cálculo manual; não é validação de identidade).` });
  };
  return (
    <div className="max-w-3xl space-y-5" data-testid="portaria-verificacao-maioridade">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <h2 className="text-lg font-bold text-amber-200">Verificação de Maioridade — Unico</h2>
        <p className="text-sm text-amber-100 mt-2">AGUARDANDO CONTRATAÇÃO. Nenhuma consulta online está ativa. O número do documento, sozinho, não comprova a idade. Não autorize a entrada com base nesta tela sem conferir a identidade.</p>
      </div>
      <div className="bg-[#121215] border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white">Preparação para consulta online</h3>
        <label className="block text-sm text-zinc-300">Tipo de documento
          <select value={tipo} onChange={e => { setTipo(e.target.value); limpar(); }} className="block w-full mt-1 p-3 rounded-lg bg-[#0A0A0C] border border-white/20">
            <option value="cpf">CPF</option><option value="rg">RG</option>
          </select>
        </label>
        <label className="block text-sm text-zinc-300">Número do documento
          <input value={documento} onChange={e => { setDocumento(e.target.value); setResultado(null); }} autoComplete="off" placeholder={tipo === "cpf" ? "Digite o CPF" : "Digite o RG"} className="block w-full mt-1 p-3 rounded-lg bg-[#0A0A0C] border border-white/20" />
        </label>
        <button type="button" disabled={!documento.trim()} onClick={consultar} className="rounded-lg bg-[#D4AF37] text-black font-bold px-5 py-3 disabled:opacity-40">Consultar pela Unico</button>
        <p className="text-xs text-zinc-400">Este botão está preparado para a futura integração. A API, credenciais e autorização de uso deverão ser configuradas no backend após a contratação. Nenhum CPF/RG é enviado ou salvo nesta versão.</p>
      </div>
      <div className="bg-[#121215] border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white">Conferência manual de idade (opcional)</h3>
        <p className="text-sm text-zinc-400">Use somente após conferir a data de nascimento em documento confiável. Não é uma consulta online.</p>
        <label className="block text-sm text-zinc-300">Data de nascimento conferida
          <input type="date" value={dataNascimento} onChange={e => { setDataNascimento(e.target.value); setResultado(null); }} className="block w-full mt-1 p-3 rounded-lg bg-[#0A0A0C] border border-white/20" />
        </label>
        <label className="flex gap-2 items-start text-sm text-zinc-200"><input type="checkbox" checked={conferido} onChange={e => setConferido(e.target.checked)} /> Conferi a data de nascimento no documento apresentado</label>
        <div className="flex gap-3 flex-wrap"><button type="button" disabled={!conferido || !dataNascimento} onClick={calcular} className="rounded-lg bg-[#D4AF37] text-black font-bold px-5 py-3 disabled:opacity-40">Calcular idade</button><button type="button" onClick={limpar} className="rounded-lg border border-white/20 px-5 py-3">Limpar dados</button></div>
      </div>
      {resultado && <div role="status" className="rounded-xl border border-white/20 p-4 text-white">{resultado.mensagem}</div>}
    </div>
  );
}
