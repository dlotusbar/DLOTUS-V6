import { formatBRL, formatDate } from "../lib/api";
import { Printer, X } from "lucide-react";

export default function Receipt({ order, onClose, onPrint, printing }) {
  if (!order) return null;
  const activeItems = (order.items || []).filter((i) => i.status !== "cancelled");
  const total = order.total || activeItems.reduce((s, i) => s + i.subtotal, 0);
  const payments = order.payments || [];
  const dinheiro = payments.find((p) => p.method === "dinheiro");
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const troco = Math.max(0, totalPaid - total);
  const shortId = (order.id || "").slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white text-black rounded-2xl shadow-2xl max-w-md w-full my-8 overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
        data-testid="receipt-modal"
      >
        {/* Receipt body */}
        <div id="receipt-print-area" className="p-6 bg-white text-black">
          <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-gray-400">
            <div className="font-black text-xl tracking-widest">D'LOTUS LOUNGE BAR</div>
            <div className="text-xs uppercase tracking-widest mt-1">Via da Venda · Caixa</div>
          </div>

          <div className="text-xs mb-3">
            <div className="flex justify-between"><span>Pedido:</span><span className="font-bold">#{shortId}</span></div>
            <div className="flex justify-between"><span>Local:</span><span>{order.table_label}</span></div>
            <div className="flex justify-between"><span>Data:</span><span>{formatDate(order.closed_at || order.created_at)}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-400 pt-3 mb-3">
            <div className="text-[10px] uppercase tracking-wider mb-2 font-bold">Itens</div>
            {activeItems.map((it) => (
              <div key={it.id} className="mb-2 text-xs">
                <div className="flex justify-between">
                  <span className="truncate pr-2">{it.quantity}x {it.product_name}</span>
                  <span className="font-bold whitespace-nowrap">{formatBRL(it.subtotal)}</span>
                </div>
                <div className="text-[10px] text-gray-500 pl-2">unit {formatBRL(it.unit_price)}</div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-gray-400 pt-3 mb-3">
            <div className="flex justify-between font-black text-lg">
              <span>TOTAL</span>
              <span>{formatBRL(total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 pt-3 text-xs">
            <div className="text-[10px] uppercase tracking-wider mb-2 font-bold">Pagamento</div>
            {payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span className="uppercase">{p.method}</span>
                <span className="font-bold">{formatBRL(p.amount)}</span>
              </div>
            ))}
            {dinheiro && totalPaid > total && (
              <>
                <div className="flex justify-between mt-1 pt-1 border-t border-gray-300">
                  <span>Recebido</span>
                  <span>{formatBRL(totalPaid)}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>TROCO</span>
                  <span>{formatBRL(troco)}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center text-[10px] uppercase tracking-widest mt-5 pt-3 border-t border-dashed border-gray-400 text-gray-600">
            * Obrigado! Volte sempre *
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[#121215] p-4 flex gap-2 border-t-4 border-[#D4AF37]">
          <button
            data-testid="receipt-close-btn"
            onClick={onClose}
            className="flex-1 py-3 bg-[#18181D] text-zinc-300 rounded-lg font-bold hover:bg-red-900/30 hover:text-red-300 transition flex items-center justify-center gap-2"
          >
            <X size={16} /> FECHAR VIA
          </button>
          <button
            data-testid="receipt-print-btn"
            onClick={onPrint}
            disabled={printing}
            className="flex-1 py-3 font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--dl-accent, #F3E5AB), var(--dl-primary, #D4AF37))", color: "#000" }}
          >
            <Printer size={16} /> {printing ? "Enviando..." : "IMPRIMIR"}
          </button>
        </div>
      </div>
    </div>
  );
}
