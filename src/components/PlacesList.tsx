import { TILES, propertyOf } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import { ownedTiles } from '../game/rent.ts';
import { checkMortgage, checkUnmortgage, checkSell } from '../game/build.ts';
import type { GameState } from '../game/types.ts';
import Button from './Button.tsx';

interface Props {
  state: GameState;
  disabled: boolean;
  onMortgage: (t: number) => void;
  onUnmortgage: (t: number) => void;
  onSell: (t: number) => void;
}

// The current player's places with Mortgage, Unmortgage and Sell actions (dimmed with a reason when not allowed).
export default function PlacesList({ state, disabled, onMortgage, onUnmortgage, onSell }: Props) {
  const tiles = ownedTiles(state, state.current);
  return (
    <div className="places">
      <strong>🏘️ {state.players[state.current].name}'s places</strong>
      {tiles.length === 0 && <small>No places yet.</small>}
      {tiles.map((t) => {
        const ps = state.properties[t];
        const m = checkMortgage(state, t);
        const u = checkUnmortgage(state, t);
        const sl = checkSell(state, t);
        const why = (c: { ok: boolean; reason?: string }) => (disabled ? 'Moving...' : c.ok ? undefined : c.reason);
        return (
          <div key={t} className={`place state-${TILES[t].state}`}>
            <div className="place__head">
              <span className="place__dot" />
              <b>{TILES[t].name}</b> <small>{formatRupees(propertyOf(TILES[t])!.price)}</small>
              <small>{ps.hotel ? ' 🏨' : ''}{'🏠'.repeat(ps.houses)}{ps.mortgaged ? ' 🔒' : ''}</small>
            </div>
            <div className="place__actions">
              {ps.mortgaged ? (
                <Button icon="🔓" onClick={() => onUnmortgage(t)} disabledReason={why(u)}>
                  {u.ok ? `Unmortgage ${formatRupees(u.cost)}` : 'Unmortgage'}
                </Button>
              ) : (
                <Button icon="🏦" onClick={() => onMortgage(t)} disabledReason={why(m)}>
                  {m.ok ? `Mortgage +${formatRupees(-m.cost)}` : 'Mortgage'}
                </Button>
              )}
              <Button icon="💰" onClick={() => onSell(t)} disabledReason={why(sl)}>
                {sl.ok ? `Sell ${sl.label} +${formatRupees(sl.cost)}` : 'Sell building'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
