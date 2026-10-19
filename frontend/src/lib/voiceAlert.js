// Alerta 11: voz falada pelo mecanismo de síntese de voz do dispositivo.
// A voz exata depende das vozes pt-BR instaladas no Windows/Android/iOS.
export function playVoiceAlert(kind, volume = 85) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return false;
  }
  const speech = window.speechSynthesis;
  speech.cancel();
  const utterance = new window.SpeechSynthesisUtterance(kind === 'rosh' ? 'OLHA O ROSH!' : 'Ó O GORÓ!');
  utterance.lang = 'pt-BR';
  utterance.volume = Math.max(0, Math.min(1, Number(volume) / 100));
  utterance.rate = 1.16;
  utterance.pitch = 1.65;
  const voices = speech.getVoices();
  const portuguese = voices.filter(v => /^pt[-_]/i.test(v.lang));
  const masculine = portuguese.find(v => /masculin|male|daniel|ricardo|felipe|antonio|paulo/i.test(v.name));
  if (masculine || portuguese[0]) utterance.voice = masculine || portuguese[0];
  speech.speak(utterance);
  return true;
}
