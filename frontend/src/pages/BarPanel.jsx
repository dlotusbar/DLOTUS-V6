import { useEffect, useState } from "react";
import { Beer, CheckCircle2, Coins, Gift } from "lucide-react";
import api from "../lib/api";
import KitchenPanel from "./KitchenPanel";

function StatCard({ icon: Icon, label, value, color, testid }) {
  return (
    <div className="bg-[#121215] border border-white/5 rounded-2xl p-4 flex items-center gap-4" data-testid={testid}>
      <div className="p-3 rounded-xl" style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
        <div className="mono text-3xl font-black text-zinc-100 leading-none mt-1">{value}</div>
      </div>
    </div>
  );
}

export default function BarPanel() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get("/kitchen/bar/stats");
        if (active) {
          setStats(data);
          setStatsError(false);
        }
      } catch {
        if (active) setStatsError(true);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <div className="px-6 lg:px-10 pt-6 lg:pt-10">
        <div className="flex items-center gap-3 mb-4">
          <Beer className="text-[#D4AF37]" size={28} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Painel</p>
            <h1 className="font-display text-3xl font-extrabold gold-text">Bar</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          <StatCard icon={CheckCircle2} label="Bebidas entregues (hoje)" value={stats?.total ?? "—"} color="#D4AF37" testid="bar-stat-total" />
          <StatCard icon={Coins} label="Pagas" value={stats?.paid ?? "—"} color="#4ade80" testid="bar-stat-paid" />
          <StatCard icon={Gift} label="Cortesias" value={stats?.cortesia ?? "—"} color="#f472b6" testid="bar-stat-cortesia" />
        </div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
          * Conta apenas bebidas marcadas como <b className="text-[#D4AF37]">Entregues</b>. Pendentes, em preparo e canceladas não entram no contador.
        </p>
        {statsError && (
          <p className="text-xs text-amber-400 mt-2" role="status">
            Não foi possível carregar os contadores. Verifique se o servidor oferece /kitchen/bar/stats.
          </p>
        )}
      </div>
      <KitchenPanel kind="bar" title="Bar" icon={Beer} hideHeader />
    </div>
  );
}
