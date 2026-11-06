// Voice announcements (instead of beeps) so every player understands what is happening, with one mute switch.
let muted = (() => { try { return localStorage.getItem('fsbg-muted') === '1'; } catch { return false; } })();
const listeners = new Set<() => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('fsbg-muted', m ? '1' : '0'); } catch { /* private mode */ }
  if (m) { try { window.speechSynthesis?.cancel(); } catch { /* no speech */ } }
  listeners.forEach((l) => l());
}
export const onMuteChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

// Turn a game message into words a voice reads naturally.
export function speakable(text: string): string {
  return text
    .replace(/₹\s?([\d,]+)/g, (_, n: string) => `${n.replace(/,/g, '')} rupees`)
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\s=\s/g, ', total ')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  const all = window.speechSynthesis.getVoices();
  voice = all.find((v) => v.lang === 'en-IN') ?? all.find((v) => v.lang.startsWith('en-GB')) ?? all.find((v) => v.lang.startsWith('en')) ?? null;
}

export function speak(text: string) {
  if (muted) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (!voice) pickVoice();
    const clean = speakable(text);
    if (!clean) return;
    synth.cancel(); // the newest announcement wins, so nothing lags behind the game
    const u = new SpeechSynthesisUtterance(clean);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-IN';
    u.rate = 1;
    synth.speak(u);
  } catch { /* speech not available */ }
}
