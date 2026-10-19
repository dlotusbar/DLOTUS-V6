import { playVoiceAlert } from '../lib/voiceAlert';
import { useEffect, useRef, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import { useTheme } from "../context/ThemeContext";
import { playSiren } from "../lib/sirenAudio";

// Alerta exclusivo do painel aberto. AudioContext exige ativação por clique do operador.
export default function PedidoSirene({ kind, items }) {
  const [enabled, setEnabled] = useState(false);
  const { settings } = useTheme();
  const siren = settings.sirens?.[kind] || { tone: 1, volume: 85, mode: "repeat" };
  const [pending, setPending] = useState([]);
  const context = useRef(null);
  const initialized = useRef(false);
  const acknowledged = useRef(new Set());
  const pendingRef = useRef([]);
  const soundedIds = useRef(new Set());
  const firstSoundAt = useRef(null);
  const playingAudio = useRef(null);
  const lastRepeatAt = useRef(0);
  const enabledRef = useRef(false);
  const sirenRef = useRef(siren);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { sirenRef.current = siren; }, [siren]);
  useEffect(() => {
    initialized.current = false;
    acknowledged.current = new Set();
    pendingRef.current = [];
    soundedIds.current = new Set();
    firstSoundAt.current = null;
    setPending([]);
  }, [kind]);
  useEffect(() => {
    const waiting = (items || []).filter(it => it.status === 'waiting');
    const ids = new Set(waiting.map(it => String(it.id)));
    if (!initialized.current) {
      // Pedidos que já estavam na fila ao abrir não disparam sirene retroativa.
      previousIds.current = ids;
      initialized.current = true;
      return;
    }
    const current = waiting.filter(it => !acknowledged.current.has(String(it.id)) && pendingRef.current.some(p => String(p.id) === String(it.id)));
    const newlyArrived = waiting.filter(it => !acknowledged.current.has(String(it.id)) && !previousIds.current.has(String(it.id)));
    const next = [...current, ...newlyArrived.filter(it => !current.some(p => String(p.id) === String(it.id)))];
    pendingRef.current = next;
    setPending(next);
    previousIds.current = ids;
  }, [items]);
  const previousIds = useRef(new Set());
  useEffect(() => { previousIds.current = new Set(); }, [kind]);
  const beep = (secondary = false) => {
    if (!enabledRef.current || !pendingRef.current.length) return;
    const cfg = sirenRef.current;
    const suffix = secondary ? 'Secondary' : '';
    const source = cfg[`source${suffix}`] || 'tone';
    const volume = Math.max(0, Math.min(1, Number(cfg.volume ?? 85) / 100));
    try {
      if (source === 'voice') {
        playVoiceAlert(kind, cfg.volume ?? 85);
      } else if (source === 'mp3' && cfg[`mp3${suffix}`]) {
        if (playingAudio.current) { playingAudio.current.pause(); playingAudio.current.currentTime = 0; }
        const audio = new Audio(cfg[`mp3${suffix}`]);
        audio.volume = volume;
        playingAudio.current = audio;
        audio.play().catch(() => {});
      } else {
        const ctx = context.current;
        if (!ctx || ctx.state !== 'running') return;
        playSiren(ctx, Number(cfg[`tone${suffix}`] || 1), Number(cfg.volume ?? 85));
      }
    } catch (_) { /* audio blocked by browser */ }
  };
  useEffect(() => {
    if (!enabled || !pending.length) { firstSoundAt.current = null; return; }
    const fresh = pendingRef.current.some(it => !soundedIds.current.has(String(it.id)));
    if (fresh) {
      firstSoundAt.current = Date.now();
      beep(false);
      pendingRef.current.forEach(it => soundedIds.current.add(String(it.id)));
    }
    if (siren.mode === 'once') return;
    if (firstSoundAt.current === null) firstSoundAt.current = Date.now();
    const interval = setInterval(() => {
      if (!pendingRef.current.length) return;
      const elapsed = Date.now() - firstSoundAt.current;
      if (Date.now() - lastRepeatAt.current < 3500) return;
      if (sirenRef.current.mode === 'escalate') {
        if (elapsed >= Math.max(5, Number(sirenRef.current.delaySeconds ?? 40)) * 1000) { beep(true); lastRepeatAt.current = Date.now(); }
      } else if (sirenRef.current.mode === 'repeat') { beep(false); lastRepeatAt.current = Date.now(); }
    }, 500);
    return () => clearInterval(interval);
  }, [enabled, pending.length, siren.mode, siren.tone, siren.volume, siren.source, siren.mp3, siren.delaySeconds, siren.toneSecondary, siren.sourceSecondary, siren.mp3Secondary]);
  useEffect(() => () => { if (context.current) context.current.close().catch(() => {}); if (playingAudio.current) playingAudio.current.pause(); }, []);
  const activate = async () => {
    try {
      if (!context.current) context.current = new (window.AudioContext || window.webkitAudioContext)();
      await context.current.resume();
      setEnabled(true);
    } catch (_) { setEnabled(false); }
  };
  const confirm = () => {
    pendingRef.current.forEach(it => acknowledged.current.add(String(it.id)));
    pendingRef.current = [];
    setPending([]);
    firstSoundAt.current = null;
    if (playingAudio.current) { playingAudio.current.pause(); playingAudio.current = null; }
  };
  return (
    <div className={`mb-4 rounded-xl border p-3 ${pending.length ? 'border-red-500 bg-red-950/40' : 'border-white/10 bg-[#18181D]'}`} data-testid={`sirene-${kind}`}>
      <div className="flex flex-wrap items-center gap-3">
        <BellRing size={20} className={pending.length ? 'text-red-400 animate-pulse' : 'text-[#D4AF37]'} />
        <strong className="text-sm text-zinc-100">Sirene de pedidos · {kind === 'rosh' ? 'Rosh' : 'Bar'}</strong>
        <button type="button" onClick={enabled ? () => setEnabled(false) : activate} className="rounded-lg bg-[#D4AF37] text-black px-3 py-2 text-xs font-bold" data-testid={`sirene-toggle-${kind}`}>
          {enabled ? 'Som ligado · Desligar' : 'Ativar som'}
        </button>
        <span className="text-xs text-zinc-400">{siren.source === 'voice' ? 'Alerta 11 · Voz' : `Sirene ${siren.tone || 1}`} · Volume definido pelo administrador</span>
        {pending.length > 0 && <button type="button" onClick={confirm} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-bold" data-testid={`sirene-confirm-${kind}`}><BellOff size={15} className="inline mr-1" /> CONFIRMAR PEDIDO ({pending.length})</button>}
      </div>
      <p className="text-xs text-zinc-400 mt-2">{pending.length ? `${pending.length} novo(s) item(ns) aguardando confirmação sonora.` : 'Som ativado pelo funcionário neste dispositivo. A sirene toca quando chegam novos pedidos.'} Confirmação do alerta não altera o status do pedido. O volume máximo depende do Windows e das caixas de som.</p>
    </div>
  );
}
