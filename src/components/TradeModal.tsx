import { useState } from 'react';
import { TILES } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import { ownedTiles } from '../game/rent.ts';
import { emptyBundle, tradeProblem } from '../game/trade.ts';
import { cardById } from '../shared/cards.ts';
import type { Bundle, GameState } from '../game/types.ts';

interface Props { state: GameState; onSend: (to: number, give: Bundle, get: Bundle) => void; onClose: () => void }

const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

// Propose a trade: choose a player, then what each side gives. Cash is changed with one-tap steps.
export default function TradeModal({ state, onSend, onClose }: Props) {
  const me = state.current;
  const others = state.players.map((_, i) => i).filter((i) => i !== me && !state.players[i].bankrupt);
  const [to, setTo] = useState(others[0]);
  const [give, setGive] = useState<Bundle>(emptyBundle());
  const [get, setGet] = useState<Bundle>(emptyBundle());
  const problem = tradeProblem(state, me, to, give, get);

  const side = (who: number, bundle: Bundle, set: (b: Bundle) => void, title: string) => {
    const p = state.players[who];
    const tradable = ownedTiles(state, who).filter((t) => !state.properties[t].houses && !state.properties[t].hotel);
    const bump = (d: number) => set({ ...bundle, cash: Math.max(0, Math.min(p.cash, bundle.cash + d)) });
    return (
      <div className="tm__side">
        <h3>{title}</h3>
        <div className="tm__cash">
          <button className="btn btn--bid" onClick={() => bump(-500)}>−500</button>
          <button className="btn btn--bid" onClick={() => bump(-100)}>−100</button>
          <b>💰 {formatRupees(bundle.cash)}</b>
          <button className="btn btn--bid" onClick={() => bump(100)}>+100</button>
          <button className="btn btn--bid" onClick={() => bump(500)}>+500</button>
        </div>
        <div className="tm__chips">
          {tradable.length === 0 && <small>No places that can be traded.</small>}
          {tradable.map((t) => (
            <button key={t} className={`chip ${bundle.tiles.includes(t) ? 'chip--on' : ''}`} onClick={() => set({ ...bundle, tiles: toggle(bundle.tiles, t) })}>
              {bundle.tiles.includes(t) ? '✔ ' : ''}{TILES[t].icon} {TILES[t].name}{state.properties[t].mortgaged ? ' 🔒' : ''}
            </button>
          ))}
          {p.heldCards.map((c) => (
            <button key={c} className={`chip ${bundle.cards.includes(c) ? 'chip--on' : ''}`} onClick={() => set({ ...bundle, cards: toggle(bundle.cards, c) })}>
              {bundle.cards.includes(c) ? '✔ ' : ''}🗝️ {cardById(c).deck === 'fortune' ? 'Fortune' : 'Festival'} Get Out of Jail Free
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="modal" role="dialog" aria-label="Propose a trade">
      <div className="modal__box">
        <h2>🤝 Trade with</h2>
        <div className="tm__who">
          {others.map((i) => (
            <button key={i} className={`chip ${i === to ? 'chip--on' : ''}`} onClick={() => { setTo(i); setGet(emptyBundle()); }}>
              {state.players[i].token} {state.players[i].name}
            </button>
          ))}
        </div>
        <div className="tm__sides">
          {side(me, give, setGive, `${state.players[me].name} gives`)}
          {side(to, get, setGet, `${state.players[to].name} gives`)}
        </div>
        {problem && <p className="tm__problem">⚠️ {problem}</p>}
        <div className="tm__actions">
          <button className="btn btn--glow" disabled={!!problem} onClick={() => onSend(to, give, get)}>📨 Send offer</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
