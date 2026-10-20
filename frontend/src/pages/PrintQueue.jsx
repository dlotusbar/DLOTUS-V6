import { useEffect, useState } from "react";
import api, { formatDate } from "../lib/api";
import { toast } from "sonner";
import { Printer, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";

export default function PrintQueue() {
  const [jobs, setJobs] = useState([]);
  const load = () => api.get("/print-jobs").then((r) => setJobs(r.data));
  useEffect(() => { load(); const i = setInterval(load, 3000); return () => clearInterval(i); }, []);

  const resend = async (j) => {
    try { const { data } = await api.post(`/print-jobs/${j.id}/resend`); toast[data.status === "sent" ? "success" : "error"](data.status === "sent" ? "Reenviado com sucesso" : "Falha ao reenviar"); load(); } catch (e) { toast.error("Erro"); }
  };

  const Icon = (s) => s === "sent" ? <CheckCircle2 size={14} className="text-emerald-400" /> : s === "error" ? <AlertTriangle size={14} className="text-red-400" /> : <Clock size={14} className="text-amber-400" />;

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-4">
      <h1 className="font-display text-3xl font-extrabold gold-text">Fila de Impressão</h1>
      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
            <tr><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Mesa</th><th className="px-4 py-3 text-left">Impressora</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-left">Horário</th><th className="px-4 py-3 text-right">Tentativas</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-white/5" data-testid={`job-${j.id}`}>
                <td className="px-4 py-2 flex items-center gap-2">{Icon(j.status)} <span className={j.status === "sent" ? "text-emerald-400" : j.status === "error" ? "text-red-400" : "text-amber-400"}>{j.status === "sent" ? "Enviado" : j.status === "error" ? "Erro" : "Aguardando"}</span></td>
                <td className="px-4 py-2 text-zinc-100">{j.table_label}</td>
                <td className="px-4 py-2 text-zinc-300">{j.printer_name} <span className="text-xs text-zinc-500">({j.printer_kind})</span></td>
                <td className="px-4 py-2 text-xs text-zinc-400">{j.copy_type === "second_copy_caixa" ? "2ª via Caixa" : "Original"}</td>
                <td className="px-4 py-2 mono text-xs text-zinc-500">{formatDate(j.last_attempt_at || j.created_at)}</td>
                <td className="px-4 py-2 mono text-right text-zinc-300">{j.attempts}</td>
                <td className="px-4 py-2 text-right">
                  {j.status === "error" && <button onClick={() => resend(j)} data-testid={`resend-${j.id}`} className="px-2 py-1 bg-[#D4AF37]/15 text-[#D4AF37] rounded text-xs flex items-center gap-1 ml-auto"><RefreshCw size={12} /> Reenviar</button>}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-zinc-500">Nenhuma impressão registrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
