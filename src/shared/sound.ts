// Soft synthesized sounds (never harsh) with one mute switch (section 20.8). No audio files needed.
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem('fsbg-muted') === '1'; } catch { return false; } })();
const listeners = new Set<() => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('fsbg-muted', m ? '1' : '0'); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
export const onMuteChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.06) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime + start;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  } catch { /* audio not available */ }
}

export const sound = {
  click: () => tone(520, 0, 0.08, 'triangle'),
  dice: () => { for (let i = 0; i < 5; i++) tone(180 + Math.random() * 120, i * 0.09, 0.07, 'triangle', 0.05); },
  hop: () => tone(660, 0, 0.06, 'sine', 0.04),
  buy: () => { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.25); },
  coin: () => { tone(988, 0, 0.07, 'triangle'); tone(1319, 0.07, 0.15, 'triangle'); },
  build: () => { tone(220, 0, 0.1, 'square', 0.03); tone(262, 0.12, 0.12, 'square', 0.03); },
  card: () => { tone(440, 0, 0.1); tone(554, 0.1, 0.1); tone(659, 0.2, 0.15); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.3)),
};
