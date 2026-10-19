import { useEffect, useState } from "react";
import api, { formatDate } from "../lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audit").then((r) => setLogs(r.data)); }, []);
  return (
    <div className="p-6 lg:p-10 pb-24 space-y-4">
      <h1 className="font-display text-3xl font-extrabold gold-text">Auditoria</h1>
      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
            <tr><th className="px-4 py-3 text-left">Horário</th><th className="px-4 py-3 text-left">Usuário</th><th className="px-4 py-3 text-left">Ação</th><th className="px-4 py-3 text-left">Entidade</th><th className="px-4 py-3 text-left">Detalhes</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="px-4 py-2 mono text-xs text-zinc-400">{formatDate(l.timestamp)}</td>
                <td className="px-4 py-2 text-zinc-100">{l.username}</td>
                <td className="px-4 py-2 text-[#D4AF37]">{l.action}</td>
                <td className="px-4 py-2 text-zinc-400">{l.entity}</td>
                <td className="px-4 py-2 text-xs text-zinc-500 mono">{JSON.stringify(l.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
