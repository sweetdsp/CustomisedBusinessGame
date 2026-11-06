import { formatRupees } from '../shared/design.ts';
import { netWorth } from '../game/networth.ts';
import type { GameState } from '../game/types.ts';

// Net worth breakdown table (also used on the results screen).
export function NetWorthTable({ state }: { state: GameState }) {
  const rows = state.players.map((p, i) => ({ p, w: netWorth(state, i) })).sort((a, b) => b.w.total - a.w.total);
  return (
    <table className="nw">
      <thead><tr><th>Player</th><th>Cash</th><th>Places</th><th>Buildings</th><th>Net worth</th></tr></thead>
      <tbody>
        {rows.map(({ p, w }) => (
          <tr key={p.name} className={p.bankrupt ? 'nw--out' : ''}>
            <td>{p.token} {p.name}{p.ai ? ` 🤖 ${p.ai}` : ''}{p.bankrupt ? ' (bankrupt)' : ''}</td>
            <td>{formatRupees(w.cash)}</td><td>{formatRupees(w.places)}</td><td>{formatRupees(w.buildings)}</td>
            <td><b>{formatRupees(w.total)}</b></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function NetWorthModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-label="Net worth">
      <div className="modal__box">
        <h2>📊 Net worth</h2>
        <NetWorthTable state={state} />
        <small>Cash + places at price (mortgaged at mortgage value) + houses and hotels at build price.</small>
        <div className="tm__actions"><button className="btn btn--glow" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
