import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatBRL, formatDate } from "../lib/api";
import { toast } from "sonner";
import { Plus, Minus, X, Printer, CheckCircle2, Clock, AlertCircle, DollarSign, Gift, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Receipt from "../components/Receipt";
import { silentPrintReceipt, isDesktop } from "../lib/desktopPrint";

const statusMap = {
  waiting: { label: "Aguardando", color: "text-orange-400 bg-orange-950/40 border-orange-500/40", icon: Clock },
  producing: { label: "Em Produção", color: "text-amber-300 bg-amber-950/40 border-amber-500/50", icon: AlertCircle },
  delivered: { label: "Entregue", color: "text-blue-400 bg-blue-950/40 border-blue-500/40", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "text-zinc-500 bg-zinc-900 border-zinc-700", icon: X },
};

function readOrder(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.map(String) : []; }
  catch (_) { return []; }
}
function sortByOrder(items, order) {
  const positions = new Map(order.map((id, i) => [String(id), i]));
  return [...items].sort((a, b) => (positions.get(String(a.id)) ?? 999999) - (positions.get(String(b.id)) ?? 999999));
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [order, setOrder] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState(null);
  const [search, setSearch] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [productToAdd, setProductToAdd] = useState(null);
  const [itemNote, setItemNote] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState(() => readOrder("dlotus-v6-category-order"));
  const [productOrder, setProductOrder] = useState(() => readOrder("dlotus-v6-product-order"));
  const dragRef = useRef(null);
  const touchRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [organizing, setOrganizing] = useState(false);

  const reorder = (kind, fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    const entries = kind === "category" ? categories : products.filter(p => p.category_id === cat);
    const current = kind === "category" ? categoryOrder : productOrder;
    const ids = sortByOrder(entries, current).map(x => String(x.id));
    const a = ids.indexOf(String(fromId)), b = ids.indexOf(String(toId));
    if (a < 0 || b < 0) return;
    ids.splice(b, 0, ids.splice(a, 1)[0]);
    const next = [...ids, ...current.filter(id => !ids.includes(id))];
    const key = kind === "category" ? "dlotus-v6-category-order" : "dlotus-v6-product-order";
    try { localStorage.setItem(key, JSON.stringify(next)); } catch (_) {}
    (kind === "category" ? setCategoryOrder : setProductOrder)(next);
    toast.success("Ordem salva neste dispositivo");
  };
  const startPointer = (e, kind, id) => {
    if (e.pointerType === "mouse") return;
    const x = e.clientX, y = e.clientY;
    touchRef.current = {kind, id, x, y, ready:false, timer:setTimeout(() => {
      if (touchRef.current?.id === id) { touchRef.current.ready = true; setOrganizing(true); }
    }, 450)};
  };
  const movePointer = (e) => {
    const t = touchRef.current;
    if (!t) return;
    if (!t.ready && Math.hypot(e.clientX-t.x, e.clientY-t.y) > 12) {
      clearTimeout(t.timer); touchRef.current = null;
    }
  };
  const endPointer = (e) => {
    const t = touchRef.current;
    if (!t) return;
    clearTimeout(t.timer); touchRef.current = null;
    if (!t.ready) return;
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 350);
    setOrganizing(false);
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest(`[data-reorder-kind="${t.kind}"]`);
    if (target) reorder(t.kind, t.id, target.dataset.reorderId);
  };

  const load = async () => {
    const [o, c, p] = await Promise.all([
      api.get(`/orders/${orderId}`), api.get("/categories"), api.get("/products"),
    ]);
    setOrder(o.data);
    const activeCats = c.data.filter((x) => x.active);
    setCategories(activeCats);
    setProducts(p.data.filter((x) => x.active));
    // Só define a categoria inicial se ainda não tiver nenhuma (evita resetar quando o usuário troca)
    setCat((prev) => prev || (activeCats[0] && activeCats[0].id) || null);
  };
  useEffect(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, [orderId]);

  if (!order) return <div className="p-8 text-zinc-500">Carregando...</div>;

  const addItem = async (prod, note = "") => {
    if (addingItem) return;
    setAddingItem(true);
    try {
      const { data } = await api.post(`/orders/${orderId}/items`, { items: [{ product_id: prod.id, quantity: 1, note: note.trim() }] });
      setOrder(data);
      setProductToAdd(null); setItemNote("");
      toast.success(order.prazo_conta_id ? `${prod.name} adicionado. Envio após autorizar crédito.` : `${prod.name} enviado para produção`);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
    finally { setAddingItem(false); }
  };

  const finalizarPrazo = async () => {
    if (!window.confirm("Confirmar venda a prazo? Após autorizar, os produtos serão enviados ao Bar/Rosh.")) return;
    try { await api.post(`/orders/${orderId}/finalizar-prazo`); toast.success("Venda a prazo registrada e enviada para produção"); navigate("/balcao"); }
    catch(e) { toast.error(e.response?.data?.detail || "Crédito não autorizado"); }
  };
  const updateItem = async (itemId, patch) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/items/${itemId}`, patch);
      setOrder(data);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q))
    : (cat ? products.filter((p) => p.category_id === cat) : products);
  const orderedProducts = sortByOrder(filtered, productOrder);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen pb-24">
      {/* Left: products */}
      <div className="flex-1 p-6 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Comanda</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-zinc-100">{order.table_label}</h1>
          </div>
          <button onClick={() => navigate("/balcao")} data-testid="back-btn" className="px-3 py-2 bg-[#18181D] rounded-lg text-sm text-zinc-400 hover:text-zinc-100">← Voltar</button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produto por nome (ex: cerveja, rosh, porção)..."
            data-testid="product-search"
            className="w-full pl-9 pr-10 py-2.5 bg-[#18181D] border border-white/10 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:border-[#D4AF37] outline-none text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              data-testid="product-search-clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-100"
              aria-label="Limpar busca"
            ><X size={14} /></button>
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-2">Segure e arraste para organizar categorias e produtos. A ordem é salva neste dispositivo.</p>
        {organizing && <p className="text-xs text-[#D4AF37] mb-2">Solte sobre a posição desejada</p>}
        <div className="flex gap-2 overflow-x-auto mb-5 pb-2">
          {sortByOrder(categories, categoryOrder).map((c) => (
            <button
              key={c.id}
              data-testid={`cat-${c.name}`}
              data-reorder-kind="category" data-reorder-id={c.id}
              draggable
              onDragStart={(e) => { dragRef.current = {kind:"category", id:c.id}; e.dataTransfer.effectAllowed="move"; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragRef.current?.kind === "category") reorder("category", dragRef.current.id, c.id); dragRef.current = null; }}
              onDragEnd={() => { dragRef.current = null; }}
              onPointerDown={(e) => startPointer(e, "category", c.id)}
              onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}
              onClick={() => { if (suppressClickRef.current) return; setCat(c.id); setSearch(""); }}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${!q && cat === c.id ? "bg-[#D4AF37] text-black font-bold" : "bg-[#18181D] text-zinc-300 hover:bg-[#22222A]"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {orderedProducts.map((p) => (
            <button
              key={p.id}
              data-testid={`prod-${p.name}`}
              data-reorder-kind="product" data-reorder-id={p.id}
              draggable
              onDragStart={(e) => { dragRef.current = {kind:"product", id:p.id}; e.dataTransfer.effectAllowed="move"; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragRef.current?.kind === "product") reorder("product", dragRef.current.id, p.id); dragRef.current = null; }}
              onDragEnd={() => { dragRef.current = null; }}
              onPointerDown={(e) => startPointer(e, "product", p.id)}
              onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}
              onClick={() => { if (!suppressClickRef.current) { setProductToAdd(p); setItemNote(""); } }}
              className="bg-[#18181D] border border-white/5 rounded-xl p-4 text-left hover:border-[#D4AF37]/60 hover:-translate-y-0.5 transition-all group"
            >
              <div className="font-medium text-zinc-100 line-clamp-2 min-h-[2.5rem]">{p.name}</div>
              <div className="mono text-[#D4AF37] text-xl font-bold mt-2">{formatBRL(p.price_sale)}</div>
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-zinc-500 text-sm">{q ? `Nenhum produto encontrado para "${search}".` : "Nenhum produto nesta categoria."}</p>}
        </div>
      </div>

      {/* Right: comanda */}
      <aside className="lg:w-96 bg-[#121215] border-l border-[#D4AF37]/15 p-6 lg:min-h-screen">
        <h3 className="font-display text-lg font-bold mb-4 text-zinc-100">Itens</h3>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {order.items.length === 0 && <p className="text-sm text-zinc-500">Comanda vazia. Toque num produto para adicionar.</p>}
          {order.items.map((it) => {
            const S = statusMap[it.status];
            const Icon = S.icon;
            return (
              <div key={it.id} className={`border rounded-lg p-3 ${S.color} ${it.cortesia ? "ring-2 ring-pink-400/60" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-100 truncate flex items-center gap-1">
                      {it.cortesia && <Gift size={12} className="text-pink-400" />}
                      {it.product_name}
                      {it.cortesia && <span className="text-[9px] uppercase tracking-widest text-pink-400 ml-1">cortesia</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <Icon size={12} /> <span>{S.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-sm text-zinc-100">{it.quantity}× {formatBRL(it.unit_price)}</div>
                    <div className={`mono font-bold ${it.cortesia ? "text-pink-400 line-through" : "text-[#D4AF37]"}`}>{formatBRL(it.cortesia ? 0 : it.subtotal)}</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <button onClick={() => updateItem(it.id, { quantity: it.quantity + 1 })} className="p-1 bg-black/30 rounded hover:bg-black/60" data-testid={`inc-${it.id}`}><Plus size={12} /></button>
                  <button onClick={() => it.quantity > 1 && updateItem(it.id, { quantity: it.quantity - 1 })} className="p-1 bg-black/30 rounded hover:bg-black/60"><Minus size={12} /></button>
                  <button onClick={() => setEditItem(it)} className="px-2 py-1 bg-black/30 rounded text-[10px] hover:bg-black/60">Preço</button>
                  <button
                    onClick={() => updateItem(it.id, { cortesia: !it.cortesia })}
                    data-testid={`cortesia-${it.id}`}
                    className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 ${it.cortesia ? "bg-pink-500/30 text-pink-200 hover:bg-pink-500/40" : "bg-black/30 text-zinc-300 hover:bg-pink-900/40"}`}
                  >
                    <Gift size={10} /> {it.cortesia ? "Remover Cortesia" : "Cortesia"}
                  </button>
                  {it.status !== "cancelled" && (
                    <button onClick={() => updateItem(it.id, { status: "cancelled" })} className="px-2 py-1 bg-red-950/40 text-red-400 rounded text-[10px] hover:bg-red-900/40">Cancelar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="flex justify-between text-sm text-zinc-400 mb-1"><span>Mesa</span><span>{order.table_label}</span></div>
          <div className="flex justify-between text-sm text-zinc-400 mb-1"><span>Aberta</span><span className="mono">{formatDate(order.created_at)}</span></div>
          <div className="flex justify-between items-end mt-3">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Total</span>
            <span className="mono text-3xl font-bold gold-text">{formatBRL(order.total)}</span>
          </div>
          {order.prazo_conta_id ? (
            can("caixa") ? (
              <button onClick={finalizarPrazo} disabled={!order.items?.length || order.status!=="open"} className="w-full mt-5 py-3 bg-amber-500 text-black font-bold rounded-lg disabled:opacity-40">CAIXA — AUTORIZAR VENDA A PRAZO E ENVIAR PEDIDOS</button>
            ) : (
              <p className="text-sm text-center text-amber-300 mt-5 p-3 bg-amber-950/30 rounded-lg">Comanda a prazo aguardando autorização do Caixa. Os pedidos ainda não foram enviados ao Bar/Rosh.</p>
            )
          ) : can("fechamento") ? (
            <button data-testid="go-to-pay" onClick={() => setShowPay(true)} className="w-full mt-5 py-3 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] text-black font-bold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2">
              <DollarSign size={18} /> FECHAR CONTA
            </button>
          ) : (
            <p className="text-xs text-center text-zinc-500 mt-5">Encaminhe o cliente ao caixa para finalizar.</p>
          )}
        </div>
      </aside>

       {productToAdd && (
         <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => { if (!addingItem) setProductToAdd(null); }}>
           <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#121215] p-5 space-y-4" onClick={e => e.stopPropagation()}>
             <h3 className="text-lg font-bold text-white">Adicionar {productToAdd.name}</h3>
             <label className="block text-sm text-zinc-300">Observação do produto (opcional)
               <textarea value={itemNote} onChange={e => setItemNote(e.target.value)} rows={3} maxLength={500} autoFocus
                 placeholder="Ex.: Combo com 2 Red Bull cereja e 1 melancia"
                 className="mt-2 w-full rounded-lg border border-white/20 bg-[#0A0A0C] p-3 text-white outline-none focus:border-[#D4AF37]" />
             </label>
             <p className="text-xs text-zinc-400">A observação acompanha este item no pedido enviado ao Bar/Rosh.</p>
             <div className="flex gap-2">
               <button disabled={addingItem} onClick={() => setProductToAdd(null)} className="flex-1 rounded-lg bg-zinc-800 p-3 text-white">Cancelar</button>
               <button disabled={addingItem} onClick={() => addItem(productToAdd, itemNote)} className="flex-1 rounded-lg bg-[#D4AF37] p-3 font-bold text-black disabled:opacity-50">{addingItem ? "Enviando..." : "ADICIONAR AO PEDIDO"}</button>
             </div>
           </div>
         </div>
       )}
      {editItem && (
        <PriceEditModal item={editItem} onClose={() => setEditItem(null)} onSave={(price) => { updateItem(editItem.id, { override_price: price }); setEditItem(null); }} />
      )}
      {showPay && <PaymentModal order={order} onClose={() => setShowPay(false)} onPaid={(paidOrder) => { setShowPay(false); setReceiptOrder(paidOrder); }} />}
      {receiptOrder && (
        <Receipt
          order={receiptOrder}
          onClose={() => { setReceiptOrder(null); navigate("/balcao"); toast.success("Venda registrada no caixa"); }}
          printing={printing}
          onPrint={async () => {
            setPrinting(true);
            try {
              // No navegador, usar a mesma impressao termica 80 mm da Portaria.
              // Nao chamar a fila do backend: ela nao alcança a USB local no Chrome.
              if (!isDesktop()) {
                const safe = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
                const items = (receiptOrder.items || []).filter((i) => i.status !== "cancelled");
                const total = Number(receiptOrder.total ?? items.reduce((s, i) => s + Number(i.subtotal || 0), 0));
                const payments = receiptOrder.payments || [];
                const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
                const hasCash = payments.some((p) => p.method === "dinheiro");
                const line = (a,b) => `<div class="line"><span>${safe(a)}</span><strong>${safe(b)}</strong></div>`;
                const html = `<!doctype html><html><head><meta charset="utf-8"><title>Via da venda</title><style>
                  @page{size:80mm auto;margin:0}html,body{margin:0;padding:0;background:white;color:black;font:12px Arial,sans-serif}
                  .receipt{box-sizing:border-box;width:80mm;padding:4mm;overflow-wrap:anywhere}
                  h2{text-align:center;font-size:16px;margin:0 0 5px}h3{text-align:center;font-size:12px;margin:0 0 10px}
                  .line{display:flex;justify-content:space-between;gap:6px;padding:3px 0}.line span{min-width:0;overflow-wrap:anywhere}.line strong{text-align:right;white-space:nowrap}
                  hr{border:0;border-top:1px dashed black;margin:9px 0}.big{font-size:16px;font-weight:bold}
                </style></head><body><div class="receipt">
                  <h2>D'LOTUS LOUNGE BAR</h2><h3>VIA DA VENDA - CAIXA</h3><hr>
                  ${line("Pedido", "#" + String(receiptOrder.id || "").slice(0,8).toUpperCase())}
                  ${line("Local", receiptOrder.table_label || "Balcao")}
                  ${line("Data", formatDate(receiptOrder.closed_at || receiptOrder.created_at))}
                  <hr><strong>ITENS</strong>
                  ${items.map(i => line(`${i.quantity}x ${i.product_name}`,formatBRL(i.subtotal))).join("")}
                  <hr><div class="big">${line("TOTAL",formatBRL(total))}</div><hr>
                  <strong>PAGAMENTO</strong>${payments.map(p => line(String(p.method || "").toUpperCase(),formatBRL(p.amount))).join("")}
                  ${hasCash && paid > total ? line("Recebido",formatBRL(paid)) + line("TROCO",formatBRL(paid-total)) : ""}
                  <hr><div style="text-align:center">* OBRIGADO! VOLTE SEMPRE *</div>
                </div></body></html>`;
                const frame = document.createElement("iframe");
                frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
                document.body.appendChild(frame);
                const doc = frame.contentDocument;
                doc.open(); doc.write(html); doc.close();
                frame.contentWindow.focus();
                frame.contentWindow.print();
                setTimeout(() => frame.remove(), 60000);
                return;
              }
              const { data } = await api.post(`/orders/${receiptOrder.id}/print-receipt`);
              if (data?.printer?.connection_type === "windows" && isDesktop() && data?.printer?.windows_printer_name) {
                const r = await silentPrintReceipt(data.printer.windows_printer_name, receiptOrder);
                if (r.ok) toast.success(`Impresso em ${data.printer.windows_printer_name}`);
                else toast.error(`Falha: ${r.error || "erro ao imprimir"}`);
              } else if (data.status === "sent") toast.success("Via enviada para a impressora Caixa");
              else if (data.status === "error") toast.error("Falha na impressão. Use 'Fila Impressão' para reenviar.");
              else toast.info("Enviando...");
            } catch (e) {
              toast.error(e.response?.data?.detail || "Erro ao imprimir");
            } finally { setPrinting(false); }
          }}
        />
      )}
    </div>
  );
}

function PriceEditModal({ item, onClose, onSave }) {
  const [v, setV] = useState(item.unit_price);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-4 text-zinc-100">Editar preço · {item.product_name}</h3>
        <input type="number" step="0.01" value={v} onChange={(e) => setV(e.target.value)} data-testid="price-input" className="w-full px-3 py-3 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mb-4" />
        <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-2 bg-[#18181D] rounded-lg text-zinc-300">Cancelar</button>
          <button onClick={() => onSave(parseFloat(v))} data-testid="save-price" className="flex-1 py-2 bg-[#D4AF37] text-black font-bold rounded-lg">Salvar</button></div>
      </div>
    </div>
  );
}

function PaymentModal({ order, onClose, onPaid }) {
  const [cashiers, setCashiers] = useState([]);
  const [cashierId, setCashierId] = useState("");
  const [payments, setPayments] = useState([{ method: "dinheiro", amount: order.total, tef_confirmed: null }]);
  const [cashReceived, setCashReceived] = useState(order.total);

  useEffect(() => { api.get("/cashiers").then((r) => { const open = r.data.filter((c) => c.status === "open"); setCashiers(r.data); if (open[0]) setCashierId(open[0].id); }); }, []);

  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const hasDinheiro = payments.some((p) => p.method === "dinheiro");
  const dinheiroAmount = payments.filter((p) => p.method === "dinheiro").reduce((s, p) => s + Number(p.amount || 0), 0);
  const nonCashAmount = total - dinheiroAmount;
  const expectedCash = Math.max(0, order.total - nonCashAmount);
  const troco = hasDinheiro ? Math.max(0, Number(cashReceived || 0) - expectedCash) : 0;
  const cashInsufficient = hasDinheiro && Number(cashReceived || 0) < expectedCash;
  const addPayment = () => setPayments([...payments, { method: "dinheiro", amount: Math.max(0, order.total - total), tef_confirmed: null }]);
  const upd = (i, k, v) => { const n = [...payments]; n[i] = { ...n[i], [k]: v }; setPayments(n); };

  const confirm = async () => {
    if (cashInsufficient) { toast.error(`Valor em dinheiro insuficiente. Falta ${formatBRL(expectedCash - Number(cashReceived || 0))}`); return; }
    try {
      const finalPayments = payments.map((p) => ({ method: p.method, amount: Number(p.amount), tef_confirmed: p.method === "tef" ? true : null }));
      // If dinheiro, adjust the paid amount to cash received so troco is recorded
      if (hasDinheiro) {
        const idx = finalPayments.findIndex((p) => p.method === "dinheiro");
        if (idx >= 0) finalPayments[idx].amount = Number(cashReceived);
      }
      await api.post(`/orders/${order.id}/close`, { cashier_id: cashierId, payments: finalPayments });
      const { data: refreshed } = await api.get(`/orders/${order.id}`);
      onPaid(refreshed);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao fechar"); }
  };

  const canConfirm = cashierId && !cashInsufficient && (hasDinheiro ? Number(cashReceived) + nonCashAmount >= order.total : total >= order.total);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#121215] border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl font-bold gold-text mb-1">Finalizar Venda</h3>
        <p className="text-sm text-zinc-500 mb-4">{order.table_label}</p>

        <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/40 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-400">Total da Venda</p>
          <p className="mono text-4xl font-bold gold-text mt-1">{formatBRL(order.total)}</p>
        </div>

        <div className="mb-4">
          <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-2">Caixa</label>
          <select data-testid="pay-cashier" value={cashierId} onChange={(e) => setCashierId(e.target.value)} className="w-full px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100">
            {cashiers.filter((c) => c.status === "open").map((c) => <option key={c.id} value={c.id}>{c.name} (aberto)</option>)}
            {cashiers.filter((c) => c.status === "open").length === 0 && <option value="">Nenhum caixa aberto</option>}
          </select>
        </div>

        <div className="space-y-2 mb-3">
          <label className="text-xs uppercase tracking-widest text-zinc-400 block">Forma de Pagamento</label>
          {payments.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={p.method} onChange={(e) => upd(i, "method", e.target.value)} data-testid={`pay-method-${i}`} className="flex-1 px-2 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 text-sm">
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="debito">💳 Débito</option>
                <option value="credito">💳 Crédito</option>
                <option value="pix">⚡ Pix</option>
                <option value="tef">📟 TEF/POS</option>
              </select>
              <input type="number" step="0.01" value={p.amount} onChange={(e) => upd(i, "amount", e.target.value)} data-testid={`pay-amount-${i}`} className="w-28 px-2 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 text-sm mono text-right" />
              {payments.length > 1 && <button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="p-2 text-red-400"><X size={14} /></button>}
            </div>
          ))}
        </div>
        <button onClick={addPayment} className="text-xs text-[#D4AF37] mb-4">+ Dividir pagamento</button>

        {hasDinheiro && (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 mb-4">
            <label className="text-xs uppercase tracking-widest text-emerald-300 block mb-2">💵 Valor Recebido em Dinheiro</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-emerald-400 font-bold mono">R$</span>
              <input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                data-testid="cash-received"
                autoFocus
                className="w-full pl-12 pr-3 py-3 bg-[#0A0A0C] border-2 border-emerald-500/40 rounded-lg text-zinc-100 text-xl mono font-bold focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[expectedCash, expectedCash + 10, expectedCash + 20, 50, 100, 200].filter((v, i, a) => a.indexOf(v) === i && v > 0).slice(0, 6).map((v) => (
                <button key={v} onClick={() => setCashReceived(v)} className="px-2 py-1 bg-[#18181D] text-emerald-300 rounded text-xs mono hover:bg-emerald-900/40">R$ {v.toFixed(0)}</button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-1 text-sm">
              <div className="flex justify-between text-zinc-400"><span>Esperado em dinheiro</span><span className="mono">{formatBRL(expectedCash)}</span></div>
              <div className="flex justify-between text-zinc-200 font-bold"><span>Recebido</span><span className="mono">{formatBRL(Number(cashReceived || 0))}</span></div>
              <div className={`flex justify-between text-lg font-bold ${cashInsufficient ? "text-red-400" : "text-emerald-400"}`}>
                <span>{cashInsufficient ? "⚠ FALTA" : "✓ TROCO"}</span>
                <span className="mono" data-testid="troco-display">{formatBRL(cashInsufficient ? expectedCash - Number(cashReceived || 0) : troco)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} data-testid="pay-cancel" className="flex-1 py-3 bg-[#18181D] rounded-lg text-zinc-300 font-medium">CANCELAR</button>
          <button onClick={confirm} disabled={!canConfirm} data-testid="confirm-pay" className="flex-1 py-3 font-bold rounded-lg disabled:opacity-30" style={{ background: "linear-gradient(135deg, var(--dl-accent, #F3E5AB), var(--dl-primary, #D4AF37))", color: "#000" }}>CONFIRMAR PAGAMENTO</button>
        </div>
        <p className="text-xs text-zinc-500 mt-3">⚠ TEF: a venda só será marcada como paga após confirmação da maquineta (simulada).</p>
      </div>
    </div>
  );
}
