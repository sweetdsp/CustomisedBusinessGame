import { useEffect, useRef, useState } from 'react';
import { TIMINGS } from '../shared/design.ts';
import { sound } from '../shared/sound.ts';
import type { GameState } from '../game/types.ts';

interface Particle { id: number; kind: 'confetti' | 'coin'; x: number; y: number; dx: number; dy: number; glyph: string; delay: number }

const centre = (el: Element | null) => { const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; };
const CONFETTI = ['🌸', '🌼', '🎊', '✨', '🪔', '🌺'];
let uid = 1;

// Celebrations, coins and sounds, driven only by what changed in the game state (never blocks play).
export default function Effects({ state }: { state: GameState }) {
  const prev = useRef<GameState | null>(null);
  const [parts, setParts] = useState<Particle[]>([]);

  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (!p) return;
    const add: Particle[] = [];
    // Buying: petals and confetti burst on the tile
    for (const [k, ps] of Object.entries(state.properties)) {
      const before = p.properties[+k];
      if (before.owner === null && ps.owner !== null) {
        const c = centre(document.querySelector(`[data-tile="${k}"]`));
        if (c) for (let i = 0; i < 14; i++) add.push({ id: uid++, kind: 'confetti', x: c.x, y: c.y, dx: (Math.random() - 0.5) * 220, dy: -40 - Math.random() * 160, glyph: CONFETTI[i % CONFETTI.length], delay: Math.random() * 0.15 });
        sound.buy();
      }
      if (ps.houses > before.houses || (ps.hotel && !before.hotel)) sound.build();
    }
    // Money moving between two players: coins fly from payer to receiver
    const diffs = state.players.map((pl, i) => pl.cash - p.players[i].cash);
    const from = diffs.findIndex((d) => d < 0), to = diffs.findIndex((d) => d > 0);
    if (from >= 0 && to >= 0 && diffs.filter((d) => d !== 0).length === 2) {
      const a = centre(document.querySelector(`[data-seat="${from}"]`)), b = centre(document.querySelector(`[data-seat="${to}"]`));
      if (a && b) for (let i = 0; i < 6; i++) add.push({ id: uid++, kind: 'coin', x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y, glyph: '🪙', delay: i * 0.08 });
      sound.coin();
    }
    if (state.lastCard && state.lastCard.id !== p.lastCard?.id) sound.card();
    if (state.gameOver && !p.gameOver) sound.win();
    if (add.length) {
      setParts((cur) => [...cur, ...add]);
      const ids = new Set(add.map((a) => a.id));
      setTimeout(() => setParts((cur) => cur.filter((c) => !ids.has(c.id))), TIMINGS.celebrate + 800);
    }
  }, [state]);

  return (
    <div className="fx" aria-hidden>
      {parts.map((q) => (
        <span key={q.id} className={`fx__p fx__p--${q.kind}`}
          style={{ left: q.x, top: q.y, ['--dx' as string]: `${q.dx}px`, ['--dy' as string]: `${q.dy}px`, animationDelay: `${q.delay}s` }}>{q.glyph}</span>
      ))}
    </div>
  );
}
