import { useEffect, useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { Printer, Trash2, Edit2, MapPin, Wifi, Usb, Bluetooth, Share2, MonitorSmartphone, Search, X, CheckCircle2, FlaskConical } from "lucide-react";
import { isDesktop, listWindowsPrinters, silentPrintTest } from "../lib/desktopPrint";

const KINDS = [
  { id: "bar", label: "🍺 Bar", desc: "Imprime pedidos de bebidas (cervejas, drinks, baldes)" },
  { id: "cozinha", label: "🍳 Cozinha", desc: "Imprime pedidos de comida (porções, combos)" },
  { id: "rosh", label: "🔥 Rosh", desc: "Imprime pedidos de narguilé/rosh" },
  { id: "caixa", label: "💰 Caixa / Balcão", desc: "Imprime a via final e segunda via para o caixa" },
  { id: "host", label: "🎧 Host / DJ", desc: "Imprime pedidos para o host ou outro local" },
];

const CONN_TYPES = [
  { id: "windows", label: "🖥 Windows (auto)", icon: MonitorSmartphone, help: "Usa uma impressora já instalada no Windows (recomendado)" },
  { id: "network", label: "🌐 Rede (IP)", icon: Wifi, help: "Impressora com IP fixo na rede local" },
  { id: "usb", label: "🔌 USB", icon: Usb, help: "Conectada diretamente via cabo USB" },
  { id: "bluetooth", label: "📶 Bluetooth", icon: Bluetooth, help: "Pareada via Bluetooth" },
  { id: "shared", label: "🖨 Compartilhada", icon: Share2, help: "Compartilhada em rede como \\\\PC\\PRINTER" },
];

const empty = { name: "", kind: "bar", location: "", connection_type: "windows", address: "", port: 9100, model: "", windows_printer_name: "", active: true };

export default function PrintersAdmin() {
  const [printers, setPrinters] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [winModal, setWinModal] = useState(false);
  const [winList, setWinList] = useState([]);
  const [winLoading, setWinLoading] = useState(false);
  const [winError, setWinError] = useState("");

  const load = () => api.get("/printers").then((r) => setPrinters(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Informe o nome da impressora");
    if (form.connection_type === "windows" && !form.windows_printer_name) {
      return toast.error("Clique em 'Buscar impressoras do Windows' e escolha uma");
    }
    try {
      const payload = { ...form, port: Number(form.port) || 9100 };
      if (editing) await api.put(`/printers/${editing}`, payload);
      else await api.post("/printers", payload);
      toast.success(editing ? "Impressora atualizada" : "Impressora cadastrada");
      setForm(empty); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };
  const edit = (p) => { setEditing(p.id); setForm({ ...empty, ...p }); window.scrollTo(0, 0); };
  const del = async (p) => { if (window.confirm(`Remover ${p.name}?`)) { await api.delete(`/printers/${p.id}`); load(); } };
  const toggle = async (p) => { await api.put(`/printers/${p.id}`, { ...p, active: !p.active }); load(); };

  const openWindowsSearch = async () => {
    setWinError("");
    setWinList([]);
    setWinModal(true);
    if (!isDesktop()) {
      setWinError("Esta função só funciona no app desktop D'Lotus PDV instalado no Windows. No navegador o sistema não tem permissão para listar as impressoras.");
      return;
    }
    setWinLoading(true);
    try {
      const res = await listWindowsPrinters();
      if (!res.ok) setWinError(res.error || "Não foi possível listar as impressoras");
      else if (!res.printers || res.printers.length === 0) setWinError("Nenhuma impressora encontrada no Windows. Verifique se há impressora instalada.");
      else setWinList(res.printers);
    } catch (e) {
      setWinError(String(e));
    } finally { setWinLoading(false); }
  };

  const selectWindowsPrinter = (p) => {
    setForm((f) => ({
      ...f,
      connection_type: "windows",
      windows_printer_name: p.name,
      name: f.name || p.displayName || p.name,
      model: f.model || p.description || "",
      address: "",
      port: 9100,
    }));
    setWinModal(false);
    toast.success(`Impressora Windows selecionada: ${p.displayName || p.name}`);
  };

  const connTypeInfo = CONN_TYPES.find((c) => c.id === form.connection_type);
  const kindInfo = KINDS.find((k) => k.id === form.kind);

  const addressPlaceholder = {
    network: "192.168.1.50",
    usb: "USB001 ou /dev/usb/lp0",
    bluetooth: "00:11:22:33:44:55",
    shared: "\\\\PC-CAIXA\\EPSON-TMT20",
  }[form.connection_type] || "";

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-6">
      <h1 className="font-display text-3xl font-extrabold gold-text">Impressoras</h1>

      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5 space-y-5">
        <h3 className="font-display text-xl font-bold text-zinc-100">{editing ? "Editar Impressora" : "Nova Impressora"}</h3>

        {/* STEP 1: Local de impressão */}
        <div>
          <label className="text-xs uppercase tracking-widest text-[#D4AF37] block mb-3 font-bold">1 · Onde esta impressora vai imprimir?</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setForm({ ...form, kind: k.id })}
                data-testid={`kind-${k.id}`}
                className={`p-3 rounded-xl border-2 text-left transition ${form.kind === k.id ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-white/10 bg-[#0A0A0C] hover:border-white/30"}`}
              >
                <div className="text-sm font-bold text-zinc-100">{k.label}</div>
              </button>
            ))}
          </div>
          {kindInfo && <p className="text-xs text-zinc-500 mt-2">💡 {kindInfo.desc}</p>}
        </div>

        {/* STEP 2: Identificação */}
        <div>
          <label className="text-xs uppercase tracking-widest text-[#D4AF37] block mb-3 font-bold">2 · Identificação</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Nome da impressora *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="printer-name" placeholder="Ex: Epson Bar Principal" className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1 flex items-center gap-1"><MapPin size={10} /> Local físico (descrição)</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} data-testid="printer-location" placeholder="Ex: Bar do térreo / Cozinha principal / Caixa 1" className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400 block mb-1">Modelo (opcional)</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Ex: Epson TM-T20, Bematech MP-4200" className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100" />
            </div>
          </div>
        </div>

        {/* STEP 3: Conexão */}
        <div>
          <label className="text-xs uppercase tracking-widest text-[#D4AF37] block mb-3 font-bold">3 · Como a impressora está conectada?</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            {CONN_TYPES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setForm({ ...form, connection_type: c.id })}
                  data-testid={`conn-${c.id}`}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${form.connection_type === c.id ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]" : "border-white/10 bg-[#0A0A0C] text-zinc-400 hover:border-white/30"}`}
                >
                  <Icon size={20} />
                  <span className="text-xs text-center">{c.label}</span>
                </button>
              );
            })}
          </div>
          {connTypeInfo && <p className="text-xs text-zinc-500 mb-3">💡 {connTypeInfo.help}</p>}

          {form.connection_type === "windows" ? (
            <div className="bg-[#0A0A0C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
              <button
                onClick={openWindowsSearch}
                data-testid="btn-search-windows-printers"
                className="w-full md:w-auto px-4 py-2.5 rounded-lg font-bold flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--dl-accent, #F3E5AB), var(--dl-primary, #D4AF37))", color: "#000" }}
              >
                <Search size={16} /> BUSCAR IMPRESSORAS DO WINDOWS
              </button>
              {form.windows_printer_name ? (
                <div className="flex items-center gap-2 text-sm bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2 text-emerald-300">
                  <CheckCircle2 size={16} />
                  <span className="font-mono">{form.windows_printer_name}</span>
                  <button
                    onClick={() => setForm({ ...form, windows_printer_name: "" })}
                    className="ml-auto text-xs text-emerald-300/70 hover:text-emerald-200"
                  >limpar</button>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">Nenhuma impressora selecionada. Clique no botão acima para listar as impressoras instaladas no Windows.</div>
              )}
              <div className="text-[10px] text-zinc-600 leading-relaxed">
                * O sistema vai imprimir diretamente nesta impressora, sem precisar de IP, porta ou caminho. A impressão será silenciosa (sem abrir o diálogo do Windows).
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-400 block mb-1">
                  {form.connection_type === "network" ? "Endereço IP" : form.connection_type === "usb" ? "Porta USB" : form.connection_type === "bluetooth" ? "MAC Bluetooth" : "Caminho compartilhado"}
                </label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="printer-address" placeholder={addressPlaceholder} className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mono" />
              </div>
              {form.connection_type === "network" && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Porta (RAW)</label>
                  <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="9100" className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mono" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 4: Status */}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Ativa (receber impressões)
        </label>

        <div className="flex gap-2 pt-2 border-t border-white/5">
          <button onClick={save} data-testid="save-printer" className="px-5 py-2.5 font-bold rounded-lg" style={{ background: "linear-gradient(135deg, var(--dl-accent, #F3E5AB), var(--dl-primary, #D4AF37))", color: "#000" }}>
            {editing ? "Atualizar" : "Cadastrar Impressora"}
          </button>
          {editing && <button onClick={() => { setEditing(null); setForm(empty); }} className="px-5 py-2.5 bg-[#18181D] text-zinc-300 rounded-lg">Cancelar</button>}
        </div>
      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {printers.map((p) => {
          const kind = KINDS.find((k) => k.id === p.kind);
          const conn = CONN_TYPES.find((c) => c.id === (p.connection_type || "network"));
          const ConnIcon = conn?.icon || Wifi;
          return (
            <div key={p.id} className="bg-[#121215] border border-white/5 rounded-2xl p-4" data-testid={`printer-${p.name}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${p.active ? "bg-emerald-950/50 text-emerald-400" : "bg-zinc-900 text-zinc-500"}`}>
                  <Printer size={22} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggle(p)} className={`text-xs px-2 py-1 rounded ${p.active ? "bg-emerald-950/40 text-emerald-400" : "bg-zinc-900 text-zinc-500"}`}>{p.active ? "On" : "Off"}</button>
                  <button onClick={() => edit(p)} className="p-1.5 text-zinc-400 hover:text-[#D4AF37]"><Edit2 size={14} /></button>
                  <button onClick={() => del(p)} className="p-1.5 text-zinc-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="font-bold text-zinc-100">{p.name}</div>
              <div className="text-xs text-[#D4AF37] uppercase tracking-widest mt-1">{kind?.label || p.kind}</div>
              {p.location && <div className="flex items-center gap-1 text-xs text-zinc-400 mt-2"><MapPin size={10} /> {p.location}</div>}
              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1 mono">
                <ConnIcon size={10} />
                {p.connection_type === "windows" ? (
                  <span>{p.windows_printer_name || <span className="italic">sem impressora</span>}</span>
                ) : p.address ? (
                  <span>{p.address}{p.connection_type === "network" && p.port ? `:${p.port}` : ""}</span>
                ) : (
                  <span className="italic">sem endereço</span>
                )}
              </div>
              {p.model && <div className="text-[10px] text-zinc-600 mt-1">{p.model}</div>}
              {p.connection_type === "windows" && p.windows_printer_name && (
                <button
                  onClick={async () => {
                    if (!isDesktop()) return toast.error("Teste disponível apenas no app desktop");
                    const t = toast.loading(`Enviando teste para ${p.windows_printer_name}...`);
                    const r = await silentPrintTest(p.windows_printer_name);
                    toast.dismiss(t);
                    if (r.ok) toast.success("Teste enviado! Verifique a impressora.");
                    else toast.error("Falha: " + (r.error || "erro"));
                  }}
                  data-testid={`test-print-${p.id}`}
                  className="mt-3 w-full px-3 py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <FlaskConical size={14} /> IMPRIMIR TESTE
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Lista de impressoras do Windows */}
      {winModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setWinModal(false)}>
          <div className="bg-[#121215] border border-[#D4AF37]/40 rounded-2xl p-5 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-zinc-100 flex items-center gap-2">
                <MonitorSmartphone size={20} className="text-[#D4AF37]" /> Impressoras do Windows
              </h3>
              <button onClick={() => setWinModal(false)} className="text-zinc-400 hover:text-zinc-100"><X size={18} /></button>
            </div>

            {winLoading && <div className="text-sm text-zinc-400 py-6 text-center">Buscando impressoras instaladas...</div>}

            {winError && (
              <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-3 text-sm text-red-300" data-testid="windows-error">
                {winError}
              </div>
            )}

            {!winLoading && !winError && winList.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="windows-printers-list">
                {winList.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => selectWindowsPrinter(p)}
                    data-testid={`win-printer-${p.name}`}
                    className="w-full text-left p-3 bg-[#0A0A0C] border border-white/10 rounded-lg hover:border-[#D4AF37] transition flex items-center gap-3"
                  >
                    <Printer size={18} className="text-[#D4AF37] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-zinc-100 truncate">{p.displayName || p.name}</div>
                      <div className="text-[10px] text-zinc-500 mono truncate">{p.name}</div>
                      {p.description && <div className="text-[10px] text-zinc-600 truncate">{p.description}</div>}
                    </div>
                    {p.isDefault && <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded uppercase tracking-widest">Padrão</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[10px] text-zinc-600 mt-4 leading-relaxed">
              * Esta função usa a API nativa do Windows através do app desktop D'Lotus PDV. Se estiver rodando no navegador, instale o app desktop para habilitar esta função.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
