// Auctions (section 26). Pure; time comes from state.now (server clock, ms).
import { CONSTANTS } from '../shared/constants.ts';
import { TILES } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import type { GameState } from './types.ts';

const ms = (s: number) => s * 1000;

// Start an auction for an unowned place. None is held when no player can afford the starting bid.
export function startAuction(state: GameState, tile: number): { state: GameState; started: boolean } {
  const anyone = state.players.some((p) => !p.bankrupt && p.cash >= CONSTANTS.AUCTION_START_BID);
  if (!anyone) return { state, started: false };
  return {
    started: true,
    state: { ...state, auction: { tile, bid: 0, bidder: null, endsAt: state.now + ms(CONSTANTS.AUCTION_SECONDS) } },
  };
}

// One-tap raise (+100 or +500). The first tap sets the opening bid. Never above the bidder's cash.
export function bid(state: GameState, seat: number, step: number): GameState {
  const a = state.auction;
  if (!a) throw new Error('No auction open');
  if (!(CONSTANTS.AUCTION_BID_STEPS as readonly number[]).includes(step)) throw new Error('Bad bid step');
  const p = state.players[seat];
  if (!p || p.bankrupt) throw new Error('Cannot bid');
  if (a.bidder === seat) throw new Error('You already lead the bid');
  const amount = a.bid + step;
  if (amount > p.cash) throw new Error('Not enough cash');
  // The countdown is lifted to at least 3 seconds after a bid, never above 10.
  const remaining = Math.max(a.endsAt - state.now, ms(CONSTANTS.AUCTION_RESET_SECONDS));
  const endsAt = state.now + Math.min(remaining, ms(CONSTANTS.AUCTION_SECONDS));
  return {
    ...state, auction: { ...a, bid: amount, bidder: seat, endsAt },
    message: `${p.name} bids ${formatRupees(amount)} for ${TILES[a.tile].name}`,
  };
}

export function bidReason(state: GameState, seat: number, step: number): string | undefined {
  const a = state.auction;
  const p = state.players[seat];
  if (!a) return 'No auction';
  if (p.bankrupt) return 'Out of the game';
  if (a.bidder === seat) return 'You lead the bid';
  if (a.bid + step > p.cash) return 'Not enough cash';
  return undefined;
}

// When the countdown ends the highest bidder pays the bank and gets the place; no bids leaves it unowned.
export function settleAuction(state: GameState): GameState {
  const a = state.auction;
  if (!a || state.now < a.endsAt) return state;
  let next: GameState = { ...state, auction: null };
  const name = TILES[a.tile].name;
  if (a.bidder === null) {
    next.message = `No bids: ${name} stays unowned. Land on it to buy it.`;
  } else {
    next = {
      ...next,
      players: next.players.map((p, i) => (i === a.bidder ? { ...p, cash: p.cash - a.bid } : p)),
      properties: { ...next.properties, [a.tile]: { ...next.properties[a.tile], owner: a.bidder } },
      message: `${state.players[a.bidder].name} wins ${name} for ${formatRupees(a.bid)}!`,
    };
  }
  return startNextQueued(next);
}

// After a bankruptcy several places wait in a queue, one auction at a time.
export function startNextQueued(state: GameState): GameState {
  let s = state;
  while (!s.auction && s.auctionQueue.length > 0) {
    const [tile, ...rest] = s.auctionQueue;
    s = { ...s, auctionQueue: rest };
    s = startAuction(s, tile).state;
  }
  return s;
}
