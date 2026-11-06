import { CONSTANTS } from '../shared/constants.ts';
import { formatRupees } from '../shared/design.ts';
import { debtTotal } from '../game/endgame.ts';
import type { GameState } from '../game/types.ts';
import TimerRing from './TimerRing.tsx';

// Shown while a player has to raise money (30 seconds), then bankruptcy.
export default function DebtPanel({ state, now, canAct, onBankrupt }: { state: GameState; now: number; canAct: boolean; onBankrupt: (seat: number) => void }) {
  const d = state.debt!;
  const left = Math.max(0, Math.ceil((d.endsAt - now) / 1000));
  const p = state.players[d.seat];
  const need = debtTotal(state) - p.cash;
  return (
    <div className="auction">
      <div className="auction__top">
        <TimerRing seconds={left} total={CONSTANTS.DEBT_GRACE_SECONDS} big />
        <div>
          <div className="auction__title">⚠️ {p.name} owes {formatRupees(debtTotal(state))}</div>
          <div className="trade__line">Has {formatRupees(p.cash)}. Needs {formatRupees(Math.max(0, need))} more.</div>
          <div className="trade__line">Mortgage places or sell buildings (left list), or go bankrupt.</div>
        </div>
      </div>
      {canAct && (
        <div className="auction__buttons">
          <button className="btn btn--bid" onClick={() => onBankrupt(d.seat)}>🏳️ {p.name}: I'm bankrupt</button>
        </div>
      )}
    </div>
  );
}
