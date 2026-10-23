import { useEffect, useState } from "react";
import api from "../lib/api";
import { X, Gift } from "lucide-react";

export default function CortesiaDetalhes({ kind, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get(`/kitchen/${kind}/history`).then(({ data }) => {
      if (active) setRows((Array.isArray(data) ? data : []).filter(item => item.cortesia === true || item.cortesia === 1 || item.cortesia === "true"));
    }).catch(() => { if (active) setError("Não foi possível carregar as cortesias."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind]);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Detalhes das cortesias" onClick={onClose}>
      <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-pink-400 flex items-center gap-2"><Gift size={20}/> Cortesias entregues hoje — {kind === "bar" ? "Bar" : "Rosh"}</h2>
          <button type="button" onClick={onClose} className="text-zinc-300 p-2" aria-label="Fechar"><X size={22}/></button>
        </div>
        {loading ? <p className="text-zinc-400">Carregando...</p> : error ? <p className="text-red-400">{error}</p> : (
          <>
            <p className="text-zinc-300 mb-3">Total de itens em cortesia: <strong>{rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}</strong></p>
            {rows.length === 0 ? <p className="text-zinc-400">Nenhuma cortesia entregue hoje.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm text-left text-zinc-200">
                <thead><tr className="border-b border-white/20 text-zinc-400"><th className="p-2">Mesa</th><th className="p-2">Cliente</th><th className="p-2">Produto</th><th className="p-2">Qtd.</th><th className="p-2">Entregue</th></tr></thead>
                <tbody>{rows.map((r, i) => <tr key={r.item_id || i} className="border-b border-white/10"><td className="p-2">{r.table_label || "—"}</td><td className="p-2">{r.customer_name || r.client_name || r.nome_cliente || "Não informado"}</td><td className="p-2">{r.product_name || "—"}</td><td className="p-2">{r.quantity ?? "—"}</td><td className="p-2">{r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}) : "—"}</td></tr>)}</tbody>
              </table></div>
            )}
          </>
        )}
        <button type="button" onClick={onClose} className="mt-5 rounded-lg bg-[#D4AF37] text-black font-bold px-5 py-2">Fechar</button>
      </div>
    </div>
  );
}
