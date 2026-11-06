import { TILES, propertyOf } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import { CONSTANTS } from '../shared/constants.ts';
import { bidReason } from '../game/auction.ts';
import type { GameState } from '../game/types.ts';
import TimerRing from './TimerRing.tsx';

interface Props { state: GameState; now: number; canBid: (seat: number) => boolean; onBid: (seat: number, step: number) => void }

// Big countdown and one-tap bid buttons for every human player (computers bid on their own).
export default function AuctionPanel({ state, now, canBid, onBid }: Props) {
  const a = state.auction!;
  const tile = TILES[a.tile];
  const left = Math.min(CONSTANTS.AUCTION_SECONDS, Math.max(0, Math.ceil((a.endsAt - now) / 1000))); // never shows more than the full time
  return (
    <div className="auction">
      <div className="auction__top">
        <TimerRing seconds={left} total={CONSTANTS.AUCTION_SECONDS} big />
        <div>
          <div className="auction__title">🔨 Auction: {tile.icon} {tile.name}</div>
          <div className="auction__bid">
            {a.bidder === null ? `Opening bid ${formatRupees(CONSTANTS.AUCTION_START_BID)}` : `${formatRupees(a.bid)} by ${state.players[a.bidder].name}`}
          </div>
          <small>Worth {formatRupees(propertyOf(tile)!.price)}</small>
        </div>
      </div>
      <div className="auction__buttons">
        {state.players.map((p, seat) => p.bankrupt || !canBid(seat) ? null : (
          <div key={seat} className="auction__player">
            <b>{p.token} {p.name}</b>
            {CONSTANTS.AUCTION_BID_STEPS.map((step) => {
              const why = bidReason(state, seat, step);
              return (
                <button key={step} className="btn btn--bid" disabled={!!why} title={why} onClick={() => onBid(seat, step)}>
                  +{formatRupees(step)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
