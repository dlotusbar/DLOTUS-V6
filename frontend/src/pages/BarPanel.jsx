import { useEffect, useState } from "react";
import { Beer, CheckCircle2, Coins, Gift, BellRing } from "lucide-react";
import KitchenPanel from "./KitchenPanel";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#121215] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}22`, color }}><Icon size={22} /></div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
        <div className="mono text-3xl font-black text-zinc-100 leading-none mt-1">{value}</div>
      </div>
    </div>
  );
}

export default function BarPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminder, setReminder] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      const now = new Date();
      if (now.getHours() < 6) { if (active) setReminder(false); return; }
      // Contagem realizada depois das 06:00 do dia atual.
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6);
      try {
        const { data } = await api.get('/compras/contagens');
        const today = Array.isArray(data) && data.some(item => {
          const stamp = item.created_at;
          return stamp && new Date(stamp).getTime() >= start.getTime();
        });
        if (active) setReminder(!today);
      } catch (_) { /* Não confirmar conclusão sem resposta do servidor. */ }
    };
    check();
    const timer = setInterval(check, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const isAtendente = (user?.role || "").trim().toLowerCase() === "atendente";
  const [stats, setStats] = useState({ total: 0, paid: 0, cortesia: 0 });
  useEffect(() => {
    let mounted = true;
    const load = () => api.get("/kitchen/bar/stats")
      .then(({ data }) => { if (mounted) setStats({ total: Number(data.total) || 0, paid: Number(data.paid) || 0, cortesia: Number(data.cortesia) || 0 }); })
      .catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);
  return (
    <div>
      {reminder && <div role="alert" className="mx-6 lg:mx-10 mt-6 rounded-2xl border border-amber-500/70 bg-amber-950/60 p-5 text-white">
        <div className="flex items-center gap-3 font-bold text-amber-300"><BellRing size={24}/> ATENÇÃO: CONTAGEM DE BEBIDAS — 06:00</div>
        <p className="mt-2 text-sm">Está na hora de realizar e salvar a contagem de bebidas do Bar. O aviso permanece até uma contagem ser registrada no sistema.</p>
        <button type="button" onClick={() => navigate('/compras')} className="mt-4 rounded-xl bg-amber-500 px-5 py-3 font-bold text-black">REALIZAR CONTAGEM</button>
      </div>}
      <div className="px-6 lg:px-10 pt-6 lg:pt-10">
        <div className="flex items-center gap-3 mb-4">
          <Beer className="text-[#D4AF37]" size={28} />
          <div><p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Painel</p><h1 className="font-display text-3xl font-extrabold gold-text">Bar</h1></div>
        </div>
        {!isAtendente && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          <StatCard icon={CheckCircle2} label="Bebidas entregues (hoje)" value={stats.total} color="#D4AF37" />
          <StatCard icon={Coins} label="Pagas" value={stats.paid} color="#4ade80" />
          <StatCard icon={Gift} label="Cortesia" value={stats.cortesia} color="#f472b6" />
        </div>}
        {!isAtendente && <p className="text-[10px] text-zinc-600 uppercase tracking-widest">* Contagem de bebidas marcadas como entregues; pendentes e canceladas não entram.</p>}
      </div>
      <KitchenPanel kind="bar" title="Bar" icon={Beer} hideHeader />
    </div>
  );
}
