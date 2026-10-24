import { useEffect, useRef, useState } from "react";
import api, { formatBRL, formatDate } from "../lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Lock, Unlock, CreditCard, Printer, Search, DollarSign } from "lucide-react";
import Receipt from "../components/Receipt";
import { silentPrintReceipt, silentPrintCashClose, buildCashCloseHtml, pickCaixaPrinter, isDesktop } from "../lib/desktopPrint";

export default function CaixaPanel() {
  const [cashiers, setCashiers] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [initial, setInitial] = useState({});
  const [tab, setTab] = useState("pendentes");
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [sharingClose, setSharingClose] = useState(false);
  const closePrintingRef = useRef(false);
  const closeBusyRef = useRef(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [sangriaCash, setSangriaCash] = useState(null);
  const [sangriaAmount, setSangriaAmount] = useState("");
  const [sangriaReason, setSangriaReason] = useState("");
  const [sangriaBusy, setSangriaBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyDate, setHistoryDate] = useState("");
  const [historyCashier, setHistoryCashier] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [closeModal, setCloseModal] = useState(null); // { cashier, report, closed }

  const load = async () => {
    const [c, o, p, pr] = await Promise.all([
      api.get("/cashiers"),
      api.get("/orders?status_filter=open"),
      api.get("/orders?status_filter=paid"),
      api.get("/printers"),
    ]);
    setCashiers(c.data); setOpenOrders(o.data); setPaidOrders(p.data); setPrinters(pr.data);
  };
  useEffect(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, []);

  const loadHistory = async () => {
    setHistoryBusy(true);
    try {
      const { data } = await api.get("/cash-closing-history", { params: {
        ...(historyDate ? { date_from: historyDate, date_to: historyDate } : {}),
        ...(historyCashier ? { cashier_id: historyCashier } : {}),
      }});
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) { toast.error(e.response?.status === 404 ? "Histórico não encontrado no servidor. Feche o PDV, reinicie o backend atualizado e abra novamente." : (e.response?.data?.detail || "Não foi possível carregar o histórico")); }
    finally { setHistoryBusy(false); }
  };
  useEffect(() => { if (tab === "historico") loadHistory(); }, [tab, historyDate, historyCashier]);

  const open = async (c) => {
    const v = Number(initial[c.id] || 0);
    if (v < 0) return toast.error("Valor inválido");
    try {
      await api.post(`/cashiers/${c.id}/open`, { initial_change: v });
      toast.success(`${c.name} aberto com troco de ${formatBRL(v)}`);
      setInitial((s) => ({ ...s, [c.id]: "" }));
      load();
    } catch (e) { toast.error("Erro"); }
  };

  const submitSangria = async () => {
    if (!sangriaCash || sangriaBusy) return;
    setSangriaBusy(true);
    try {
      await api.post(`/sangrias/caixa/${sangriaCash.id}`, { amount: Number(sangriaAmount), reason: sangriaReason, request_id: crypto.randomUUID() });
      toast.success("Sangria registrada"); setSangriaCash(null); setSangriaAmount(""); setSangriaReason(""); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Não foi possível registrar sangria"); }
    finally { setSangriaBusy(false); }
  };

  const openClose = async (c) => {
    try {
      const { data } = await api.get(`/cashiers/${c.id}/report`);
      setCloseModal({ cashier: c, report: data, closed: false });
    } catch (e) { toast.error("Erro ao buscar resumo"); }
  };

  const confirmClose = async () => {
    if (!closeModal || closeBusyRef.current) return;
    const current = closeModal;
    closeBusyRef.current = true;
    setCloseBusy(true);
    try {
      await api.post(`/cashiers/${current.cashier.id}/close`);
    } catch (e) {
      const detail = e.response?.data?.detail;
      const message = typeof detail === "string" ? detail :
        (detail?.message || detail?.mensagem || e.message || "Falha de comunicação com o servidor");
      toast.error(`Não foi possível confirmar o fechamento: ${message}`);
      // Uma falha de rede pode ocorrer após o servidor ter fechado o caixa.
      // Atualiza o estado sem reenviar automaticamente a operação financeira.
      try {
        const { data: latest } = await api.get("/cashiers");
        setCashiers(latest);
        const updated = latest.find(c => c.id === current.cashier.id);
        if (updated?.status !== "open") {
          setCloseModal({ ...current, closed: true });
          toast.info("O caixa consta como fechado no servidor. Confira o histórico antes de repetir a operação.");
        }
      } catch (_) { /* Estado não confirmado; não repetir automaticamente. */ }
      closeBusyRef.current = false;
      setCloseBusy(false);
      return;
    }

    // POST confirmado: o fechamento já aconteceu. Falha no relatório não
    // deve ser mostrada como falha no fechamento.
    setCloseModal({ ...current, closed: true });
    toast.success(`${current.cashier.name} fechado`);
    try {
      const { data } = await api.get(`/cashiers/${current.cashier.id}/report`);
      setCloseModal(prev => prev?.cashier.id === current.cashier.id ? { ...prev, report: data, closed: true } : prev);
    } catch (e) {
      toast.warning("Caixa fechado, mas não foi possível atualizar o relatório. Consulte o histórico.");
    }
    try { await load(); } catch (_) { /* Não desfaz o fechamento. */ }
    if (tab === "historico") { try { await loadHistory(); } catch (_) {} }
    closeBusyRef.current = false;
    setCloseBusy(false);
  };

  const printReport = async () => {
    if (!closeModal?.closed || closePrintingRef.current) return;
    closePrintingRef.current = true;
    setPrinting(true);
    try {
      const html = buildCashCloseHtml(closeModal.report, { title: "FECHAMENTO DE CAIXA", subtitle: closeModal.cashier.name });
      const p = pickCaixaPrinter(printers);
      if (isDesktop() && p?.windows_printer_name) {
        const r = await silentPrintCashClose(p.windows_printer_name, closeModal.report, { title: "FECHAMENTO DE CAIXA", subtitle: closeModal.cashier.name });
        if (r.ok) toast.success(`Uma via enviada para ${p.windows_printer_name}`);
        else toast.error(`Impressão não concluída: ${r.error || "erro"}`);
      } else {
        // Imprime SOMENTE o cupom de 80 mm, nunca a tela inteira do PDV.
        const frame = document.createElement("iframe");
        frame.setAttribute("title", "Relatório térmico de fechamento");
        frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
        document.body.appendChild(frame);
        const doc = frame.contentDocument;
        doc.open(); doc.write(html); doc.close();
        await new Promise(resolve => setTimeout(resolve, 200));
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1500);
        toast.info("Selecione sua impressora térmica 80 mm na janela de impressão.");
      }
    } catch (e) { toast.error(`Falha ao imprimir: ${e.message || e}`); }
    finally { closePrintingRef.current = false; setPrinting(false); }
  };


  // Fotografa o próprio relatório visível, sem recriar o layout no canvas.
  const shareCloseImage = async () => {
    if (!closeModal?.closed || sharingClose) return;
    const source = document.querySelector('[data-testid="close-cashier-report"]');
    if (!source) return toast.error("Relatório não encontrado na tela");
    setSharingClose(true);
    let objectUrl;
    try {
      // Clona somente o cartão do fechamento; botões não fazem parte da imagem.
      const copy = source.cloneNode(true);
      const copyStyles = (original, cloned) => {
        const computed = window.getComputedStyle(original);
        for (const property of computed) {
          cloned.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
        }
        for (let i = 0; i < original.children.length; i++) {
          copyStyles(original.children[i], cloned.children[i]);
        }
      };
      copyStyles(source, copy);
      const width = Math.ceil(source.getBoundingClientRect().width);
      copy.style.width = `${width}px`;
      copy.style.maxWidth = "none";
      copy.style.height = "auto";
      copy.style.maxHeight = "none";
      copy.style.overflow = "visible";
      const holder = document.createElement("div");
      holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden;pointer-events:none;`;
      holder.appendChild(copy);
      document.body.appendChild(holder);
      const height = Math.ceil(copy.scrollHeight) + 2;
      holder.remove();
      const serialized = new XMLSerializer().serializeToString(copy);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#121215">${serialized}</div></foreignObject></svg>`;
      objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("O celular não conseguiu capturar o relatório. Tente pelo Chrome."));
        img.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Falha ao criar PNG");
      ctx.fillStyle = "#121215";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Não foi possível salvar a imagem do relatório");
      const file = new File([blob], "fechamento-caixa-dlotus.png", { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try { await navigator.share({ files: [file] }); }
        catch (e) { if (e.name !== "AbortError") throw e; }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        toast.info("Imagem salva. Envie pelo WhatsApp.");
      }
    } catch (e) {
      toast.error(e.message || "Não foi possível compartilhar a imagem");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setSharingClose(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Caixa</p>
        <h1 className="font-display text-3xl font-extrabold gold-text">Operação de Caixa</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cashiers.map((c) => (
          <div key={c.id} className={`border rounded-2xl p-6 ${c.status === "open" ? "border-emerald-500/40 bg-emerald-950/10" : "border-white/10 bg-[#121215]"}`} data-testid={`cashier-${c.name}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold text-zinc-100">{c.name}</h3>
                <p className={`text-xs uppercase tracking-widest ${c.status === "open" ? "text-emerald-400" : "text-zinc-500"}`}>{c.status === "open" ? "Aberto" : "Fechado"}</p>
              </div>
              {c.status === "open" ? <Unlock className="text-emerald-400" /> : <Lock className="text-zinc-500" />}
            </div>
            {c.status === "open" ? (
              <>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-zinc-400"><span>Troco inicial</span><span className="mono text-zinc-100">{formatBRL(c.initial_change)}</span></div>
                  <div className="flex justify-between text-zinc-400"><span>Aberto em</span><span className="mono text-zinc-100">{formatDate(c.opened_at)}</span></div>
                </div>
                <button onClick={() => setSangriaCash(c)} className="w-full mt-4 py-2.5 bg-amber-950/40 text-amber-300 rounded-lg font-bold">💵 Realizar Sangria</button>
                <button onClick={() => openClose(c)} data-testid={`close-${c.name}`} className="w-full mt-4 py-2.5 bg-red-950/40 text-red-400 rounded-lg hover:bg-red-900/40 font-bold">Fechar Caixa</button>
              </>
            ) : (
              <div className="mt-4 bg-[#0A0A0C] rounded-xl p-4 border border-white/10">
                <label className="text-xs uppercase tracking-widest text-[#D4AF37] block mb-2 font-bold flex items-center gap-1"><DollarSign size={10} /> Troco Inicial em Dinheiro</label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#D4AF37] font-bold mono">R$</span>
                  <input
                    type="number" step="0.01" min="0"
                    placeholder="0,00"
                    value={initial[c.id] || ""}
                    onChange={(e) => setInitial({ ...initial, [c.id]: e.target.value })}
                    data-testid={`initial-${c.name}`}
                    className="w-full pl-12 pr-3 py-3 bg-[#121215] border-2 border-[#D4AF37]/30 rounded-lg text-xl font-bold text-zinc-100 mono focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div className="flex gap-1 flex-wrap mb-3">
                  {[0, 50, 100, 150, 200, 300].map((v) => (
                    <button key={v} onClick={() => setInitial({ ...initial, [c.id]: String(v) })} className="px-2 py-1 bg-[#18181D] hover:bg-[#D4AF37]/15 hover:text-[#D4AF37] text-zinc-300 rounded text-xs mono">R$ {v}</button>
                  ))}
                </div>
                <button onClick={() => open(c)} data-testid={`open-${c.name}`} className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] text-black font-bold rounded-lg flex items-center justify-center gap-2">
                  <Unlock size={14} /> Abrir Caixa
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <div className="flex gap-2 mb-4 border-b border-white/5">
          <button onClick={() => setTab("pendentes")} data-testid="tab-pendentes" className={`px-4 py-2 text-sm font-medium transition ${tab === "pendentes" ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-zinc-400"}`}>
            Pendentes ({openOrders.length})
          </button>
          <button onClick={() => setTab("historico")} className={`px-4 py-2 text-sm font-medium transition ${tab === "historico" ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-zinc-400"}`}>
            Histórico de Fechamentos
          </button>
          <button onClick={() => setTab("pagas")} data-testid="tab-pagas" className={`px-4 py-2 text-sm font-medium transition ${tab === "pagas" ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-zinc-400"}`}>
            Vendas Pagas · Reimprimir ({paidOrders.length})
          </button>
        </div>

        {tab === "historico" && (
          <section className="bg-[#121215] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-xl font-bold text-zinc-100">Histórico de Fechamentos de Caixa</h2>
            <p className="text-xs text-zinc-400">Os fechamentos são registrados permanentemente a partir desta atualização. Fechamentos anteriores não podem ser reconstruídos com segurança.</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-zinc-300">Data <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="block mt-1 bg-black border border-white/20 rounded-lg p-2 text-white" /></label>
              <label className="text-sm text-zinc-300">Caixa <select value={historyCashier} onChange={e => setHistoryCashier(e.target.value)} className="block mt-1 bg-black border border-white/20 rounded-lg p-2 text-white"><option value="">Todos os caixas</option>{cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <button onClick={loadHistory} className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black font-bold">Atualizar</button>
              <button onClick={() => {setHistoryDate("");setHistoryCashier("");}} className="px-4 py-2 rounded-lg bg-white/10 text-white">Limpar filtros</button>
            </div>
            {historyBusy ? <p className="text-zinc-400">Carregando...</p> : history.length === 0 ? <p className="text-zinc-400">Nenhum fechamento registrado para os filtros selecionados.</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {history.map(h => <div key={h.id} className="rounded-xl border border-[#D4AF37]/20 bg-black/40 p-4 space-y-2">
                  <div className="flex justify-between gap-2"><strong className="text-zinc-100">{h.cashier_name}</strong><span className="text-xs text-zinc-400">{formatDate(h.closed_at)}</span></div>
                  <div className="text-xs text-zinc-400">Abertura: {formatDate(h.opened_at)} · Fechou: {h.closed_by_name || "Não informado"}</div>
                  <div className="text-xl font-bold text-[#D4AF37]">Vendido: {formatBRL(h.total_sales || 0)}</div>
                  <div className="grid grid-cols-2 gap-1 text-sm text-zinc-300">
                    <span>Dinheiro: {formatBRL(h.sales_by_method?.dinheiro || 0)}</span><span>Pix: {formatBRL(h.sales_by_method?.pix || 0)}</span>
                    <span>Débito: {formatBRL(h.sales_by_method?.debito || 0)}</span><span>Crédito: {formatBRL(h.sales_by_method?.credito || 0)}</span>
                    <span>Troco inicial: {formatBRL(h.initial_change || 0)}</span><span>Sangrias: {formatBRL(h.sangrias_total || 0)}</span>
                    <span className="col-span-2">Dinheiro esperado: {formatBRL(h.expected_cash || 0)}</span>
                    <span className="col-span-2">Vendas: {h.orders_count || 0}</span>
                  </div>
                  <button onClick={() => { const html = buildCashCloseHtml(h, {title:"HISTÓRICO DE FECHAMENTO",subtitle:h.cashier_name}); const w=window.open("", "_blank"); if(w){w.document.write(html);w.document.close();w.focus();w.print();} else toast.error("Permita pop-ups para imprimir"); }} className="rounded-lg px-3 py-2 bg-white/10 text-white text-sm flex items-center gap-2"><Printer size={14}/> Imprimir fechamento</button>
                </div>)}
              </div>
            )}
          </section>
        )}

        {tab === "pendentes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {openOrders.length === 0 && <p className="text-zinc-500 text-sm">Nenhuma comanda aberta.</p>}
            {openOrders.map((o) => (
              <Link to={`/comanda/${o.id}`} key={o.id} data-testid={`pending-${o.table_label}`} className="bg-[#121215] border border-white/5 rounded-xl p-4 hover:border-[#D4AF37]/40 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-lg font-bold text-zinc-100">{o.table_label}</span>
                  <CreditCard className="text-[#D4AF37]" size={18} />
                </div>
                <div className="text-xs text-zinc-500 mono">{formatDate(o.created_at)}</div>
                <div className="mono text-2xl font-bold gold-text mt-2">{formatBRL(o.total)}</div>
                <div className="text-xs text-zinc-400 mt-1">{o.items.length} itens</div>
              </Link>
            ))}
          </div>
        )}

        {tab === "pagas" && (
          <div>
            <div className="relative mb-4 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="search-paid" placeholder="Buscar por mesa, nº pedido..." className="w-full pl-10 pr-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100" />
            </div>
            <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
              <div className="w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x" tabIndex={0} aria-label="Tabela com rolagem horizontal"><table className="w-full text-sm">
                <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
                  <tr><th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-left">Mesa</th><th className="px-4 py-3 text-left">Fechada</th><th className="px-4 py-3 text-left">Pagamento</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3"></th></tr>
                </thead>
                <tbody>
                  {paidOrders.filter((o) => {
                    const q = search.toLowerCase();
                    if (!q) return true;
                    return o.table_label.toLowerCase().includes(q) || o.id.slice(0, 8).toLowerCase().includes(q);
                  }).slice(0, 50).map((o) => (
                    <tr key={o.id} className="border-t border-white/5 hover:bg-white/5" data-testid={`paid-${o.id}`}>
                      <td className="px-4 py-2 mono text-xs text-zinc-300">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-2 text-zinc-100">{o.table_label}</td>
                      <td className="px-4 py-2 mono text-xs text-zinc-400">{formatDate(o.closed_at)}</td>
                      <td className="px-4 py-2 text-xs text-zinc-400">{(o.payments || []).map((p) => p.method).join(", ")}</td>
                      <td className="px-4 py-2 mono text-right text-[#D4AF37]">{formatBRL(o.total)}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setReceipt(o)} data-testid={`view-${o.id}`} className="px-2 py-1 bg-[#D4AF37]/15 text-[#D4AF37] rounded text-xs flex items-center gap-1 ml-auto hover:bg-[#D4AF37]/25">
                          <Printer size={12} /> Via
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paidOrders.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-zinc-500">Nenhuma venda registrada.</td></tr>}
                </tbody>
              </table></div>
            </div>
          </div>
        )}
      </div>

      {receipt && (
        <Receipt
          order={receipt}
          onClose={() => setReceipt(null)}
          printing={printing}
          onPrint={async () => {
            setPrinting(true);
            try {
              const { data } = await api.post(`/orders/${receipt.id}/print-receipt`);
              if (data?.printer?.connection_type === "windows" && isDesktop() && data?.printer?.windows_printer_name) {
                const r = await silentPrintReceipt(data.printer.windows_printer_name, receipt);
                if (r.ok) toast.success(`Impresso em ${data.printer.windows_printer_name}`);
                else toast.error(`Falha: ${r.error || "erro ao imprimir"}`);
              } else if (data.status === "sent") toast.success("Via reimpressa com sucesso");
              else toast.error("Falha. Verifique Fila Impressão");
            } catch (e) { toast.error("Erro ao reimprimir"); }
            finally { setPrinting(false); }
          }}
        />
      )}

      {sangriaCash && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><div className="bg-[#121215] border border-[#D4AF37]/40 rounded-xl p-6 w-full max-w-md space-y-4"><h3 className="text-xl font-bold text-[#D4AF37]">Sangria — {sangriaCash.name}</h3><label className="block text-sm">Valor (R$)<input type="number" min="0.01" step="0.01" value={sangriaAmount} onChange={e => setSangriaAmount(e.target.value)} className="block w-full bg-[#09090b] border border-white/20 rounded p-3 mt-1" /></label><label className="block text-sm">Motivo<input value={sangriaReason} onChange={e => setSangriaReason(e.target.value)} className="block w-full bg-[#09090b] border border-white/20 rounded p-3 mt-1" /></label><p className="text-xs text-zinc-400">Apenas gerente ou administrador pode autorizar. A sangria não reduz o faturamento.</p><div className="flex gap-3"><button className="flex-1 p-3 bg-zinc-800 rounded" onClick={() => setSangriaCash(null)}>Cancelar</button><button disabled={sangriaBusy || !Number(sangriaAmount) || !sangriaReason.trim()} className="flex-1 p-3 bg-[#D4AF37] text-black rounded font-bold disabled:opacity-50" onClick={submitSangria}>Confirmar</button></div></div></div>}
      {closeModal && (
        <CloseCashierModal
          state={closeModal}
          onClose={() => setCloseModal(null)}
          onConfirm={confirmClose}
          onPrint={printReport}
          onShare={shareCloseImage}
          sharing={sharingClose}
          printing={printing}
          closeBusy={closeBusy}
        />
      )}
    </div>
  );
}

function CloseCashierModal({ state, onClose, onConfirm, onPrint, onShare, sharing, printing, closeBusy }) {
  const { cashier, report, closed } = state;
  const t = report.sales_by_method || {};
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121215] border border-[#D4AF37]/40 rounded-2xl p-6 max-w-md w-full my-8" data-testid="close-cashier-modal">
        <div data-testid="close-cashier-report">
        <div className="text-center mb-5">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">D'Lotus Lounge Bar</p>
          <h3 className="font-display text-2xl font-bold text-zinc-100 mt-1">
            {closed ? "✓ Caixa Fechado" : "Confirmar Fechamento"}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">{cashier.name}</p>
        </div>

        <div className="bg-[#0A0A0C] rounded-xl p-4 space-y-2 text-sm mb-4 mono">
          <div className="flex justify-between gap-3"><span className="text-zinc-400">Aberto em</span><span className="text-zinc-100">{formatDate(report.opened_at)}</span></div>
          {closed && report.closed_at && <div className="flex justify-between gap-3"><span className="text-zinc-400">Fechado em</span><span className="text-zinc-100">{formatDate(report.closed_at)}</span></div>}
          {report.opened_by_name && <div className="flex justify-between"><span className="text-zinc-400">Por</span><span className="text-zinc-100">{report.opened_by_name}</span></div>}
          <div className="flex justify-between"><span className="text-zinc-400">Troco inicial</span><span className="text-[#D4AF37] font-bold">{formatBRL(report.initial_change)}</span></div>
          <div className="border-t border-white/5 pt-2 flex justify-between"><span className="text-zinc-400">Vendas</span><span className="text-zinc-100">{report.orders_count} ({report.items_sold} itens)</span></div>
        </div>

        <div className="bg-[#0A0A0C] rounded-xl p-4 space-y-2 text-sm mb-4">
          <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-1">Entradas por forma de pagamento</div>
          {["dinheiro", "pix", "credito", "debito"].map((k) => (
            <div key={k} className="flex justify-between mono">
              <span className="text-zinc-300 uppercase">{k}</span>
              <span className="text-zinc-100">{formatBRL(t[k] || 0)}</span>
            </div>
          ))}
          <div className="border-t border-white/5 pt-2 flex justify-between mono"><span className="text-amber-300">Sangrias ({(report.sangrias || []).length})</span><span className="text-amber-300">- {formatBRL(report.sangrias_total || 0)}</span></div>
          {(report.sangrias || []).map(s => <div key={s.id} className="text-xs text-zinc-400 flex justify-between"><span>{s.reason} · {s.created_by_name}</span><span>{formatBRL(s.amount)}</span></div>)}
          <div className="border-t border-white/5 pt-2 flex justify-between mono">
            <span className="text-zinc-400">Dinheiro esperado em caixa</span>
            <span className="text-emerald-400 font-bold">{formatBRL(report.expected_cash)}</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/30 rounded-xl p-4 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-widest text-[#D4AF37]">Total vendas</span>
            <span className="mono text-3xl font-bold gold-text">{formatBRL(report.total_sales)}</span>
          </div>
        </div>

        </div>
        <div className="mt-4" />
        {closed ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={onPrint} disabled={printing} data-testid="print-close-report" className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] text-black font-bold rounded-xl flex items-center justify-center gap-2">
              <Printer size={14} /> {printing ? "Imprimindo..." : "Imprimir Relatório (80 mm)"}
            </button>
            <button onClick={onShare} disabled={sharing} className="px-4 py-3 bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50">{sharing ? "Gerando..." : "WhatsApp / Imagem"}</button>
            <button onClick={onClose} className="px-5 py-3 bg-[#18181D] text-zinc-300 rounded-xl">Fechar</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 bg-[#18181D] text-zinc-300 rounded-xl">Cancelar</button>
            <button onClick={onConfirm} disabled={closeBusy} data-testid="confirm-close-cashier" className="flex-1 py-3 bg-red-950/40 border border-red-500/40 text-red-300 font-bold rounded-xl hover:bg-red-900/40">
              {closeBusy ? "Fechando..." : "Confirmar Fechamento"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
