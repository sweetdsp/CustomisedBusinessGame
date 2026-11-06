import { CONSTANTS } from '../shared/constants.ts';
import { describeBundle } from '../game/trade.ts';
import type { GameState } from '../game/types.ts';
import TimerRing from './TimerRing.tsx';

interface Props { state: GameState; now: number; canAnswer: boolean; onAnswer: (accept: boolean) => void }

// Big message and countdown while a trade waits for an answer.
export default function TradePanel({ state, now, canAnswer, onAnswer }: Props) {
  const t = state.trade!;
  const left = Math.min(CONSTANTS.TRADE_ANSWER_SECONDS, Math.max(0, Math.ceil((t.endsAt - now) / 1000))); // never shows more than the full time
  const from = state.players[t.from], to = state.players[t.to];
  return (
    <div className="auction">
      <div className="auction__top">
        <TimerRing seconds={left} total={CONSTANTS.TRADE_ANSWER_SECONDS} big />
        <div>
          <div className="auction__title">🤝 {from.name} offers a trade to {to.name}</div>
          <div className="trade__line"><b>Gives:</b> {describeBundle(t.give)}</div>
          <div className="trade__line"><b>Wants:</b> {describeBundle(t.get)}</div>
        </div>
      </div>
      {canAnswer && (
        <div className="auction__buttons">
          <button className="btn btn--bid" onClick={() => onAnswer(true)}>✅ {to.name}: Accept</button>
          <button className="btn btn--bid" onClick={() => onAnswer(false)}>❌ Decline</button>
        </div>
      )}
    </div>
  );
}
