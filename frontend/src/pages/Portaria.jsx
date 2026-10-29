import LeitorQRReserva from "../components/LeitorQRReserva";
import { useEffect, useRef, useState } from "react";
import { CloseNeonPreview, shareClosePng } from "../lib/closeNeon";
import api, { formatBRL, formatDate } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { UserPlus, DoorOpen, Users, Settings, History, Wallet, Moon, Lock, Unlock, X, CheckCircle2, Search, AlertTriangle, Printer, QrCode, Camera, Keyboard } from "lucide-react";
import { silentPrintCashClose, pickCaixaPrinter, isDesktop } from "../lib/desktopPrint";

const TABS = [
  { id: "cobrar", label: "Cobrar Entrada", icon: DoorOpen, perm: "portaria" },
  { id: "reservas_qr", label: "Reservas QR Code", icon: QrCode, perm: "portaria" },
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
      {tab === "reservas_qr" && <ReservasQRPortaria />}
      {tab === "clientes" && <Clientes />}
      {tab === "maioridade" && <VerificacaoMaioridade />}
      {tab === "caixa" && <CaixaPortaria />}
      {tab === "noturna" && <VisaoNoturna />}
      {tab === "historico" && <Historico />}
      {tab === "config" && <ConfigPortaria />}
    </div>
  );
}

// ========== Reservas QR Code — visual Portaria D’Lotus ==========
function ReservasQRPortaria() {
  const [modo, setModo] = useState("camera");
  const [codigo, setCodigo] = useState("");
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const validandoRef = useRef(false);
  const validar = async (valor) => {
    const token = String(valor || "").trim();
    if (!token || validandoRef.current) return;
    validandoRef.current = true;
    setProcessando(true);
    setResultado(null);
    try {
      const { data } = await api.post("/reservas/checkin", { token });
      setResultado(data);
      setCodigo("");
      toast.success("Check-in da reserva registrado com sucesso!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "QR Code inválido, já utilizado ou reserva não autorizada.");
    } finally {
      validandoRef.current = false;
      setProcessando(false);
    }
  };
  return (
    <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-cyan-900/30 bg-gradient-to-b from-[#061016] via-[#080b13] to-[#100815] px-4 py-8 text-white shadow-2xl sm:px-8 sm:py-10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.38em] text-blue-700 sm:text-sm">ENTRADA</p>
      <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Portaria</h2>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-xl">Escaneie o QR Code do cliente ou digite o código da reserva.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="Modo de leitura da reserva">
        <button type="button" onClick={() => {setModo("camera");setResultado(null);}} aria-pressed={modo === "camera"} className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border px-2 py-4 text-sm font-semibold transition sm:text-xl ${modo === "camera" ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,.12)]" : "border-white/10 bg-black/25 text-zinc-400 hover:border-cyan-700/50"}`}><Camera size={22}/> Câmera</button>
        <button type="button" onClick={() => {setModo("codigo");setResultado(null);}} aria-pressed={modo === "codigo"} className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border px-2 py-4 text-sm font-semibold transition sm:text-xl ${modo === "codigo" ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,.12)]" : "border-white/10 bg-black/25 text-zinc-400 hover:border-cyan-700/50"}`}><Keyboard size={22}/> Digitar código</button>
      </div>

      {modo === "camera" ? (
        <div className="mt-7 rounded-[26px] border border-white/10 bg-[#101018]/80 p-4 sm:p-6">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-900/50 bg-black/80 p-3 sm:p-6">
            <div className="pointer-events-none absolute inset-[9%] z-10" aria-hidden="true">
              <span className="absolute left-0 top-0 h-14 w-14 border-l-[5px] border-t-[5px] border-white sm:h-20 sm:w-20" />
              <span className="absolute right-0 top-0 h-14 w-14 border-r-[5px] border-t-[5px] border-white sm:h-20 sm:w-20" />
              <span className="absolute bottom-0 left-0 h-14 w-14 border-b-[5px] border-l-[5px] border-white sm:h-20 sm:w-20" />
              <span className="absolute bottom-0 right-0 h-14 w-14 border-b-[5px] border-r-[5px] border-white sm:h-20 sm:w-20" />
            </div>
            <div className="relative z-0 min-h-64 [&_video]:w-full [&_video]:rounded-lg [&_video]:object-cover">
              <LeitorQRReserva onLido={validar} />
            </div>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-zinc-400 sm:text-base"><QrCode size={18}/> Aponte a câmera para o QR Code do cliente</p>
          {processando && <p className="mt-2 text-center text-cyan-300" role="status">Validando reserva...</p>}
        </div>
      ) : (
        <form onSubmit={(e) => {e.preventDefault();validar(codigo);}} className="mt-7 space-y-4 rounded-[26px] border border-white/10 bg-[#101018]/80 p-5 sm:p-7">
          <label htmlFor="codigo-reserva-portaria" className="block font-semibold text-zinc-200">Código da reserva</label>
          <input id="codigo-reserva-portaria" autoFocus autoComplete="off" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Digite ou cole o código do QR Code" className="w-full rounded-xl border border-cyan-900/60 bg-black/60 p-4 text-white outline-none focus:border-cyan-400" />
          <p className="text-sm text-cyan-300" role="status">{processando ? "Validando reserva..." : "Pressione Enter para validar e registrar a entrada."}</p>
        </form>
      )}
      {resultado && <div role="status" className="mt-6 space-y-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 text-emerald-100">
        <p className="flex items-center gap-2 text-lg font-bold text-emerald-300"><CheckCircle2 size={22}/> Entrada autorizada!</p>
        <p>Cliente: {resultado.cliente}</p>
        <p>Mesa: {resultado.mesa} · Pessoas: {resultado.pessoas}</p>
      </div>}
    </section>
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

  useEffect(() => {
    const refresh = () => api.get("/portaria/config").then(({data}) => setConfig(data)).catch(()=>{});
    const timer = setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus",onFocus);
    return () => {clearInterval(timer);window.removeEventListener("focus",onFocus);};
  }, []);

  const count = homens + mulheres;
  const amount = config ? homens * config.price_homem + mulheres * config.price_mulher : 0;
  const ready = count > 0 && (amount === 0 || method) && config && cash?.status === "open";
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
        id, homens, mulheres, payment_method: amount === 0 ? "dinheiro" : method, client_name: clientName
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
          <div className="text-center text-sm text-[#D4AF37]">{amount === 0 ? "VIP GRATUITO" : (method ? method.toUpperCase() : "Selecione o pagamento")}</div>
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
        detalhamento_precos: res.detalhamento_precos || totals.detalhamento_precos,
      });
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-4 sm:p-6 max-w-2xl w-full my-4 sm:my-8 min-w-0">
        <h3 className="font-display text-2xl font-bold gold-text mb-1">Fechamento de Caixa — Portaria</h3>
        <p className="text-sm text-zinc-500 mb-5">{cash.opened_by_name} · {formatDate(cash.opened_at)}</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
          <StatCard label="Homens" value={totals.homens} />
          <StatCard label="Mulheres" value={totals.mulheres} />
          <StatCard label="Total" value={totals.total_pessoas} />
          <StatCard label="Arrecadado" value={formatBRL(totals.total)} gold />
        </div>

        <div className="space-y-3 mb-4">
          <h4 className="font-bold text-zinc-100">Conferência dos recebimentos</h4>
          {["dinheiro", "pix", "credito", "debito"].map((k) => (
            <div key={k} className="rounded-xl bg-[#0A0A0C] border border-white/10 p-3 min-w-0">
              <div className="flex justify-between items-center gap-3 mb-2 flex-wrap">
                <span className="capitalize font-semibold text-zinc-100">{k === "credito" ? "Crédito" : k === "debito" ? "Débito" : k}</span>
                <span className="text-sm text-zinc-400">Esperado: {formatBRL(expected[k])}</span>
              </div>
              <label className="block text-xs text-zinc-400 mb-1" htmlFor={`contado-${k}`}>Valor conferido (R$)</label>
              <input id={`contado-${k}`} type="number" inputMode="decimal" min="0" step="0.01"
                value={counted[k]} data-testid={`counted-${k}`}
                onChange={(e) => setCounted({ ...counted, [k]: e.target.value })}
                className="w-full min-w-0 box-border px-3 py-3 bg-[#18181D] border border-white/20 rounded-lg mono text-lg text-zinc-100" />
              <div className={`text-sm mt-2 ${diffs[k] === 0 ? "text-emerald-400" : diffs[k] > 0 ? "text-blue-400" : "text-red-400"}`}>
                Diferença: {formatBRL(diffs[k])} — {diffs[k] === 0 ? "OK" : diffs[k] > 0 ? "sobra" : "falta"}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0A0A0C] rounded-lg p-3 mb-4"><div className="flex justify-between text-amber-300 font-bold"><span>Sangrias ({sangrias.items.length})</span><span>- {formatBRL(sangrias.total)}</span></div>{sangrias.items.map(s => <div key={s.id} className="flex justify-between text-xs text-zinc-400"><span>{s.reason} · {s.created_by_name}</span><span>{formatBRL(s.amount)}</span></div>)}
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Total esperado</span><span className="mono text-zinc-100">{formatBRL(Object.values(expected).reduce((s, v) => s + v, 0))}</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Total contado</span><span className="mono text-zinc-100">{formatBRL(Object.values(counted).reduce((s, v) => s + Number(v), 0))}</span></div>
          <div className="flex justify-between text-lg mt-1"><span className="text-zinc-200 font-bold">Diferença</span><span className={`mono font-bold ${totalDiff === 0 ? "text-emerald-400" : totalDiff > 0 ? "text-blue-400" : "text-red-400"}`}>{formatBRL(totalDiff)}</span></div>
        </div>

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações do fechamento (opcional)" className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mb-4" rows="2" />

        <div className="flex flex-col sm:flex-row gap-2">
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
  const precos = report.detalhamento_precos || { homem: [], mulher: [] };
  const porSexo = (sexo) => (precos[sexo] || []);
  const somaSexo = (sexo) => porSexo(sexo).reduce((s, item) => s + Number(item.total || 0), 0);
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
          detalhamento_precos: precos,
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
  const [sharing, setSharing] = useState(false);
  const shareImage = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareClosePng(report,"portaria","CAIXA PORTARIA");
      if (result === "downloaded") toast.info("PNG salvo. Envie pelo WhatsApp.");
    } catch (e) { toast.error(e.message || "Erro ao compartilhar imagem"); }
    finally { setSharing(false); }
  };
  const Line = ({ label, value, strong = false }) => <div className={`line flex justify-between gap-4 py-1 ${strong ? "strong font-bold" : ""}`}><span>{label}</span><span className="text-right">{value}</span></div>;
  return <div className="max-w-xl mx-auto space-y-4">
    <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-4 text-emerald-300 font-semibold">✓ Caixa da Portaria fechado. Relatório disponível para impressão.</div>
    <CloseNeonPreview report={report} kind="portaria" name="CAIXA PORTARIA" />
    <div id="portaria-cupom-80mm" className="mx-auto bg-[#121215] text-white rounded-2xl p-5 shadow-lg border-2 border-white" style={{position:"absolute",left:"-10000px",top:0,width:"440px",fontFamily:"Arial, sans-serif",fontSize:13,color:"#ffffff"}}>
      <h2 className="text-center text-base font-black text-sky-400">D'LOTUS LOUNGE BAR</h2>
      <h3 className="text-center text-2xl font-black my-2">✓ Caixa Fechado</h3>
      <p className="text-center text-zinc-400 mb-4">Caixa Portaria</p>
      <div className="rounded-xl bg-black/60 p-3 space-y-1">
        <Line label="Aberto em" value={formatDate(report.opened_at)} />
        <Line label="Fechado em" value={formatDate(report.closed_at)} />
        <Line label="Por" value={report.opened_by_name || "-"} />
        <Line label="Troco inicial" value={formatBRL(report.initial_amount || 0)} strong />
        <Line label="Pessoas" value={String(report.total_pessoas || 0)} />
      </div>
      <div className="rounded-xl bg-black/60 p-3 mt-3 space-y-1">
        <h4 className="text-sky-400 font-bold mb-2">ENTRADAS POR SEXO E PREÇO</h4>
        {[["mulher", "MULHERES"], ["homem", "HOMENS"]].map(([sexo, titulo]) => (
          <div key={sexo}>
            <Line label={titulo} value={`${sexo === "mulher" ? report.mulheres || 0 : report.homens || 0} pessoas`} strong />
            {porSexo(sexo).map((item) => <Line key={item.preco} label={`${item.quantidade} x ${formatBRL(item.preco)}`} value={formatBRL(item.total)} />)}
            <Line label={`Subtotal ${titulo.toLowerCase()}`} value={formatBRL(somaSexo(sexo))} strong />
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-black/60 p-3 mt-3 space-y-1">
        <h4 className="text-sky-400 font-bold mb-2">ENTRADAS POR FORMA DE PAGAMENTO</h4>
        <Line label="DINHEIRO" value={formatBRL(cash)} />
        <Line label="PIX" value={formatBRL(pix)} />
        <Line label="CRÉDITO" value={formatBRL(credito)} />
        <Line label="DÉBITO" value={formatBRL(debito)} />
        <hr className="border-solid border-white/70 my-2" />
        <Line label="Sangrias" value={formatBRL(report.sangrias_total || 0)} />
        <Line label="Dinheiro esperado em caixa" value={formatBRL(report.expected?.dinheiro || 0)} />
        <Line label="Dinheiro contado" value={formatBRL(report.counted?.dinheiro || 0)} />
        <Line label="Diferença" value={formatBRL(report.differences?.dinheiro || 0)} />
      </div>
      <div className="rounded-xl bg-amber-950/40 border border-amber-700/50 p-3 mt-3 flex justify-between items-center gap-2">
        <span className="text-sky-400 font-semibold">TOTAL VENDAS</span>
        <span className="text-sky-400 text-2xl font-black">{formatBRL(total)}</span>
      </div>
    </div>
    <div className="flex gap-3 flex-wrap">
      <button type="button" disabled={printing} onClick={print} className="flex-1 min-w-40 flex items-center justify-center gap-2 bg-white text-black font-bold rounded-lg p-3 disabled:opacity-50"><Printer size={18}/>{printing ? "Enviando..." : "Imprimir 80 mm"}</button>
      <button type="button" disabled={sharing} onClick={shareImage} className="flex-1 min-w-40 rounded-lg p-3 bg-emerald-700 text-white font-bold disabled:opacity-50">{sharing ? "Gerando imagem..." : "Compartilhar imagem / WhatsApp"}</button>
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-4 sm:p-6 max-w-2xl w-full my-4 sm:my-8 min-w-0" onClick={(e) => e.stopPropagation()}>
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
          <div><span className="text-zinc-500">Homens:</span> <span className="text-zinc-100">{t.homens}</span></div>
          <div><span className="text-zinc-500">Mulheres:</span> <span className="text-zinc-100">{t.mulheres}</span></div>
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
  const [weekly, setWeekly] = useState({});
  const [exceptions, setExceptions] = useState({});
  const [templates, setTemplates] = useState({});
  const [day, setDay] = useState("5");
  const [night, setNight] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("weekly");
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  useEffect(() => { api.get("/portaria/config").then(({data}) => {
    setConfig(data); setH(data.price_homem); setM(data.price_mulher);
    setWeekly(data.weekly || {}); setExceptions(data.exceptions || {}); setTemplates(data.templates || {});
    setNight(data.night_date || "");
  }).catch(() => toast.error("Não foi possível carregar as configurações")); }, []);
  const key = mode === "weekly" ? day : night;
  const current = mode === "weekly" ? weekly : exceptions;
  const rows = current[key] || [];
  const updateRows = (newRows) => mode === "weekly" ? setWeekly(v => ({...v, [key]: newRows})) : setExceptions(v => ({...v, [key]: newRows}));
  const updateRow = (idx, field, value) => updateRows(rows.map((r,i) => i === idx ? {...r,[field]:value} : r));
  const add = () => updateRows([...rows,{start:"00:00",homem:0,mulher:0}]);
  const save = async () => {
    setSaving(true);
    try {
      const price_homem=Number(h), price_mulher=Number(m);
      if (![price_homem,price_mulher].every(v=>Number.isFinite(v)&&v>=0)) throw new Error("Informe preços válidos");
      await api.put("/portaria/config", {price_homem,price_mulher});
      const {data}=await api.put("/portaria/schedule", {weekly,exceptions,templates});
      setConfig(data); setWeekly(data.weekly || {}); setExceptions(data.exceptions || {}); setTemplates(data.templates || {});
      toast.success("Programação da portaria salva");
    } catch(e) { toast.error(e.response?.data?.detail || e.message || "Não foi possível salvar"); }
    finally {setSaving(false);}
  };
  if (!config) return <p className="text-zinc-400">Carregando configurações...</p>;
  const inputCls="w-full mt-1 px-3 py-2 bg-[#0A0A0C] border border-white/20 rounded-lg text-white";
  return <div className="space-y-6 max-w-3xl">
    <div className="bg-[#121215] border border-white/10 rounded-2xl p-5">
      <h3 className="font-display text-xl font-bold mb-2">Valores padrão de entrada</h3>
      <p className="text-zinc-400 text-sm mb-4">Usados quando não houver uma faixa de horário ativa. VIP = R$ 0.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Homem<input type="number" min="0" step="0.01" value={h} onChange={e=>setH(e.target.value)} className={inputCls}/></label>
        <label className="text-sm">Mulher<input type="number" min="0" step="0.01" value={m} onChange={e=>setM(e.target.value)} className={inputCls}/></label>
      </div>
    </div>
    <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 space-y-4">
      <h3 className="font-display text-xl font-bold">Horários e VIP automático</h3>
      <p className="text-sm text-zinc-400">Cada faixa começa no horário indicado e vale até a próxima. Para eventos noturnos, a programação vai das 18h até as 17h59 do dia seguinte. Preços zero são VIP.</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setMode("weekly")} className={`px-4 py-2 rounded-lg ${mode==="weekly"?"bg-blue-600":"bg-zinc-800"}`}>Programação semanal</button>
        <button onClick={()=>setMode("night")} className={`px-4 py-2 rounded-lg ${mode==="night"?"bg-blue-600":"bg-zinc-800"}`}>Somente uma noite</button>
      </div>
      {mode === "weekly" ? <label className="block">Dia da semana<select className={inputCls} value={day} onChange={e=>setDay(e.target.value)}>{days.map((d,i)=><option key={i} value={i}>{d}</option>)}</select></label>
      : <label className="block">Data da noite<input className={inputCls} type="date" value={night} onChange={e=>setNight(e.target.value)}/></label>}
      {rows.map((r,i)=><div key={`${key}-${i}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
        <label className="text-xs text-zinc-400">A partir de<input type="time" className={inputCls} value={r.start} onChange={e=>updateRow(i,"start",e.target.value)}/></label>
        <label className="text-xs text-zinc-400">Homem R$<input type="number" min="0" step="0.01" className={inputCls} value={r.homem} onChange={e=>updateRow(i,"homem",e.target.value)}/></label>
        <label className="text-xs text-zinc-400">Mulher R$<input type="number" min="0" step="0.01" className={inputCls} value={r.mulher} onChange={e=>updateRow(i,"mulher",e.target.value)}/></label>
        <button className="p-2 bg-red-900/50 rounded-lg" title="Excluir faixa" onClick={()=>updateRows(rows.filter((_,j)=>j!==i))}>✕</button>
      </div>)}
      <button onClick={add} className="px-4 py-2 border border-blue-500 text-blue-300 rounded-lg">+ Adicionar horário</button>
      <p className="text-xs text-zinc-400">Para retirar uma exceção e voltar ao padrão semanal, use o botão abaixo.</p>
      {mode === "night" && <button className="text-amber-300 text-sm underline" onClick={()=>setExceptions(v=>{const copy={...v};delete copy[night];return copy;})}>Voltar ao padrão semanal nesta noite</button>}
    </div>
    <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 space-y-3">
      <h3 className="font-display text-lg font-bold">Modelos salvos</h3>
      <div className="flex gap-2"><input className={inputCls} placeholder="Nome do modelo (ex.: Sexta Mostradinha)" value={templateName} onChange={e=>setTemplateName(e.target.value)}/><button className="bg-zinc-700 rounded-lg px-3" onClick={()=>{if(!templateName.trim())return;setTemplates(v=>({...v,[templateName.trim()]:rows.map(r=>({...r}))}));toast.info("Modelo adicionado. Clique em Salvar tudo.");}}>Guardar</button></div>
      <div className="flex flex-wrap gap-2">{Object.keys(templates).map(name=><button key={name} onClick={()=>updateRows(templates[name].map(r=>({...r})))} className="px-3 py-2 rounded-lg border border-white/20 text-sm">Aplicar: {name}</button>)}</div>
    </div>
    <button disabled={saving} onClick={save} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50">{saving?"Salvando...":"SALVAR TUDO"}</button>
  </div>;
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
