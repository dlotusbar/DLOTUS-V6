// Dez padrões sintéticos de alerta sem arquivos externos.
const PATTERNS = [
 [880,660,880,660],[540,740,940,740],[1050,750,1050,750],
 [400,550,700,900],[950,950,650,650],[680,860,680,860,1020],
 [300,600,900,600],[1100,900,700,500],[600,600,900,900,1100],[800,1000,1200,1000,800]
];
export function playSiren(ctx, tone=1, volume=85) {
 if (!ctx || ctx.state !== 'running') return;
 const seq=PATTERNS[Math.max(0,Math.min(9,Number(tone)-1))] || PATTERNS[0];
 const v=Math.min(.22,Math.max(0,Number(volume))/450);
 const start=ctx.currentTime;
 seq.forEach((freq,i)=>{
  const t=start+i*.19, osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=i%2?'sawtooth':'square';osc.frequency.setValueAtTime(freq,t);
  gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(Math.max(.0001,v),t+.02);
  gain.gain.setValueAtTime(Math.max(.0001,v),t+.14);gain.gain.linearRampToValueAtTime(.0001,t+.18);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.19);
 });
}
