import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatBRL } from "../lib/api";
import { toast } from "sonner";
import { Zap, Users as UsersIcon, X, User, WalletCards } from "lucide-react";

export default function Balcao() {
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [tablesError, setTablesError] = useState(false);
  const [cashiers, setCashiers] = useState([]);
  const [quickCashierId, setQuickCashierId] = useState("");
  const [tab, setTab] = useState("venda"); // venda | rapida
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [prazoModal, setPrazoModal] = useState(false);
  const [prazoContas, setPrazoContas] = useState([]);
  const [prazoCliente, setPrazoCliente] = useState(null);
  const [prazoBusca, setPrazoBusca] = useState("");
  const [novoPrazo, setNovoPrazo] = useState({cliente:"", telefone:"", vencimento:""});
  const [tableCustomer, setTableCustomer] = useState(null); // table pending customer-name prompt
  const navigate = useNavigate();

  // Atualização sequencial: uma requisição por vez, sem acumular chamadas lentas.
  // Quando a aba fica oculta, interrompe o polling; ao voltar, atualiza imediatamente.
  useEffect(() => {
    let active = true;
    let pending = false;
    let timer;
    let controller;
    const schedule = () => {
      clearTimeout(timer);
      if (active && !document.hidden) timer = setTimeout(fetchTables, 6000);
    };
    const fetchTables = async () => {
      if (!active || pending || document.hidden) return;
      pending = true;
      controller = new AbortController();
      try {
        const { data } = await api.get("/tables", { signal: controller.signal });
        if (active) {
          setTables(Array.isArray(data) ? data : []);
          setTablesError(false);
        }
      } catch (error) {
        if (active && error.code !== "ERR_CANCELED" && error.name !== "CanceledError") {
          setTablesError(true);
        }
      } finally {
        pending = false;
        if (active) {
          setLoadingTables(false);
          schedule();
        }
      }
    };
    const onVisible = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        clearTimeout(timer);
        fetchTables();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    fetchTables();
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      controller?.abort();
    };
  }, []);
  useEffect(() => { api.get("/cashiers").then(r => setCashiers(r.data.filter(c => c.status === "open"))).catch(() => {}); }, [showQuickModal]);

  const mesas1 = tables.filter((t) => t.kind === "mesa" && t.number <= 16);
  const bistros = tables.filter((t) => t.kind === "bistro");
  const mesas2 = tables.filter((t) => t.kind === "mesa" && t.number >= 41);

  const abrirPrazo = async () => {
    try { const r = await api.get("/prazo/contas"); setPrazoContas(r.data); setPrazoModal(true); }
    catch(e) { toast.error(e.response?.data?.detail || "Erro ao buscar clientes"); }
  };
  const cadastrarPrazo = async (e) => {
    e.preventDefault();
    try { const r = await api.post("/prazo/contas", novoPrazo); setPrazoContas(v=>[r.data,...v]); setPrazoCliente(r.data); setPrazoModal(false); setTab("prazo"); toast.success("Cliente selecionado. Escolha a mesa."); }
    catch(e) { toast.error(e.response?.data?.detail || "Não foi possível cadastrar"); }
  };
  const openTable = async (t) => {
    if (t.open_order_id) {
      if (tab === "prazo") { toast.error("Mesa com comanda aberta. Selecione uma mesa livre para a venda a prazo."); return; }
      navigate(`/comanda/${t.open_order_id}`); return;
    }
    if (tab === "prazo") {
      if (!prazoCliente) { abrirPrazo(); return; }
      try { const r = await api.post("/orders", {table_id:t.id, items:[], quick_sale:false, prazo_conta_id:prazoCliente.id}); navigate(`/comanda/${r.data.id}`); }
      catch(e) { toast.error(e.response?.data?.detail || "Erro ao abrir venda a prazo"); }
      return;
    }
    setTableCustomer(t);
    setCustomerName("");
  };

  const confirmOpenTable = async () => {
    const t = tableCustomer;
    if (!t) return;
    try {
      const { data } = await api.post("/orders", { table_id: t.id, items: [], quick_sale: false, customer_name: customerName.trim() || null });
      setTableCustomer(null); setCustomerName("");
      navigate(`/comanda/${data.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao abrir mesa"); }
  };

  const confirmQuickSale = async () => {
    if (!quickCashierId) { toast.error("Escolha o caixa responsável pela Venda Rápida"); return; }
    try {
      const { data } = await api.post("/orders", { quick_sale: true, items: [], customer_name: customerName.trim() || null, origin_cashier_id: quickCashierId });
      setShowQuickModal(false); setCustomerName("");
      navigate(`/comanda/${data.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  return (
    <div className="p-6 lg:p-10 pb-24">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-1">Balcão</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold gold-text">Vendas</h1>
        </div>
        <div className="flex gap-2 bg-[#121215] p-1 rounded-xl border border-white/5">
          <button
            data-testid="tab-venda"
            onClick={() => {setTab("venda");setPrazoCliente(null);}}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${tab === "venda" ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-zinc-100"}`}
          >
            <UsersIcon size={14} /> Venda
          </button>
          <button
            data-testid="tab-rapida"
            onClick={() => { setTab("rapida"); setCustomerName(""); setShowQuickModal(true); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${tab === "rapida" ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-zinc-100"}`}
          >
            <Zap size={14} /> Venda Rápida
          </button>
          <button data-testid="tab-prazo" onClick={abrirPrazo}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${tab === "prazo" ? "bg-[#D4AF37] text-black" : "text-zinc-300 hover:text-white hover:bg-[#28222a]"}`}>
            <WalletCards size={14}/> Vendas a Prazo
          </button>
        </div>
      </div>

      {tab === "prazo" && prazoCliente && <p className="mb-4 p-3 bg-amber-950/40 rounded-lg text-amber-200">Venda a prazo para <b>{prazoCliente.cliente}</b>. Escolha uma mesa. <button className="underline ml-3" onClick={abrirPrazo}>Trocar cliente</button></p>}
      {prazoModal && <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"><section className="bg-[#121215] border border-amber-700 rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"><h2 className="text-xl font-bold text-amber-300">Selecionar cliente — Venda a Prazo</h2><input className="w-full bg-zinc-900 p-3 rounded" placeholder="Buscar cliente ou telefone" value={prazoBusca} onChange={e=>setPrazoBusca(e.target.value)}/><div className="max-h-44 overflow-y-auto space-y-1">{prazoContas.filter(c=>(c.cliente+" "+c.telefone).toLowerCase().includes(prazoBusca.toLowerCase())).map(c=><button key={c.id} className="block w-full text-left p-2 bg-zinc-800 rounded hover:bg-zinc-700" onClick={()=>{setPrazoCliente(c);setTab("prazo");setPrazoModal(false);toast.success("Escolha a mesa para "+c.cliente)}}>{c.cliente} — {c.telefone}</button>)}</div><h3 className="font-bold">Cadastrar novo cliente</h3><form onSubmit={cadastrarPrazo} className="space-y-2">{[["cliente","Nome"],["telefone","Telefone"],["vencimento","Data de pagamento"]].map(([k,label])=><label key={k} className="block text-sm">{label}<input required={k!=="telefone"} type={k==="vencimento"?"date":"text"} className="block w-full bg-zinc-900 p-2 rounded" value={novoPrazo[k]} onChange={e=>setNovoPrazo({...novoPrazo,[k]:e.target.value})}/></label>)}<button className="bg-amber-500 text-black rounded px-4 py-2 font-bold">Cadastrar e selecionar</button></form><button className="text-zinc-300 underline" onClick={()=>setPrazoModal(false)}>Cancelar</button></section></div>}
      {loadingTables && <p role="status" className="mb-4 text-sm text-zinc-300">Carregando mesas do servidor...</p>}
      {tablesError && <p role="alert" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">Conexão lenta ou indisponível. Mantendo as últimas mesas carregadas; nova tentativa automática em alguns segundos.</p>}
      <TableGroup title="Mesas 1-16" tables={mesas1} onOpen={openTable} />
      <TableGroup title="Bistrôs 17-40" tables={bistros} onOpen={openTable} />
      <TableGroup title="Mesas 41-47" tables={mesas2} onOpen={openTable} />

      {(showQuickModal || tableCustomer) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => { setShowQuickModal(false); setTableCustomer(null); }}>
          <div className="bg-[#121215] border border-[#D4AF37]/40 rounded-2xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-zinc-100 flex items-center gap-2">
                <User size={18} className="text-[#D4AF37]" />
                {tableCustomer ? `Abrir ${tableCustomer.kind === "bistro" ? "Bistrô" : "Mesa"} ${tableCustomer.number}` : "Venda Rápida"}
              </h3>
              <button onClick={() => { setShowQuickModal(false); setTableCustomer(null); }} className="text-zinc-400 hover:text-zinc-100"><X size={18} /></button>
            </div>
            {!tableCustomer && <label className="block text-xs uppercase tracking-widest text-[#D4AF37] mb-3 font-bold">Caixa responsável (escolha uma vez por venda)
              <select value={quickCashierId} onChange={e => setQuickCashierId(e.target.value)} className="block w-full mt-2 px-3 py-2.5 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100">
                <option value="">Selecione o caixa</option>
                {cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>}
            <label className="text-xs uppercase tracking-widest text-[#D4AF37] block mb-2 font-bold">Nome do cliente (opcional)</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") (tableCustomer ? confirmOpenTable() : confirmQuickSale()); }}
              placeholder="Ex: João, Maria..."
              autoFocus
              data-testid="customer-name-input"
              className="w-full px-3 py-2.5 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 focus:border-[#D4AF37] outline-none"
            />
            <p className="text-[10px] text-zinc-500 mt-2">* Se preenchido, o nome aparece junto da mesa/comanda no cupom e no histórico.</p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowQuickModal(false); setTableCustomer(null); }}
                className="flex-1 py-2.5 bg-[#18181D] text-zinc-300 rounded-lg font-medium"
              >Cancelar</button>
              <button
                onClick={tableCustomer ? confirmOpenTable : confirmQuickSale}
                data-testid="confirm-open-order"
                className="flex-1 py-2.5 bg-[#D4AF37] text-black rounded-lg font-bold"
              >
                {tableCustomer ? "Abrir Comanda" : "Iniciar Venda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableGroup({ title, tables, onOpen }) {
  return (
    <div className="mb-8">
      <h3 className="text-xs uppercase tracking-widest text-zinc-400 mb-3">{title}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {tables.map((t) => {
          const occupied = !!t.open_order_id;
          return (
            <button
              key={t.id}
              data-testid={`table-${t.kind}-${t.number}`}
              onClick={() => onOpen(t)}
              className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                occupied
                  ? "bg-amber-950/40 border-amber-500/60 hover:border-amber-400 hover:-translate-y-0.5"
                  : "bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400 hover:-translate-y-0.5"
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">{t.kind === "bistro" ? "Bistrô" : "Mesa"}</span>
              <span className="font-display text-3xl font-bold text-zinc-100 mono">{t.number}</span>
              {occupied && <span className="mono text-xs text-amber-400">{formatBRL(t.total)}</span>}
              {!occupied && <span className="text-[10px] text-emerald-400 uppercase tracking-widest">Livre</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
