// Debts, bankruptcy, turn passing and the end of the game (sections 11, 29, 32). Pure.
import { CONSTANTS } from '../shared/constants.ts';
import { formatRupees } from '../shared/design.ts';
import { cardById } from '../shared/cards.ts';
import { ownedTiles } from './rent.ts';
import { netWorth } from './networth.ts';
import { settle } from './money.ts';
import { startNextQueued } from './auction.ts';
import type { GameState } from './types.ts';

const active = (s: GameState) => s.players.map((p, i) => i).filter((i) => !s.players[i].bankrupt);

// Winner(s) by net worth; equal highest worth is a shared win.
export function winnersByNetWorth(state: GameState): number[] {
  const live = active(state);
  const best = Math.max(...live.map((i) => netWorth(state, i).total));
  return live.filter((i) => netWorth(state, i).total === best);
}

export const gameDeadline = (state: GameState): number | null =>
  state.endMode.kind === 'timed' ? state.startedAt + state.endMode.minutes * 60_000 : null;

// A timed game ends when the clock is out, but only after the current player's turn has finished.
export function endIfTimeUp(state: GameState): GameState {
  const d = gameDeadline(state);
  if (state.gameOver || d === null || state.now < d) return state;
  return { ...state, gameOver: { winners: winnersByNetWorth(state), reason: 'time' }, message: 'Time is up!' };
}

// Next active player's turn (a bankrupt player is skipped). Ends a timed game if time ran out.
export function passTurn(state: GameState): GameState {
  let next = state.current;
  do next = (next + 1) % state.players.length; while (state.players[next].bankrupt);
  const s: GameState = {
    ...state, current: next, phase: 'awaitRoll', doublesCount: 0, extraTurn: false, buildTile: null, lastCard: undefined,
    tradesThisTurn: 0, message: `${state.players[next].name}'s turn`,
  };
  return endIfTimeUp(s);
}

// Debt paid at once as soon as the player has raised enough (after a mortgage or sale), or when time runs out.
export function settleDebtIfCovered(state: GameState): GameState {
  const d = state.debt;
  if (!d) return state;
  const total = d.owed.reduce((n, o) => n + o.amount, 0);
  if (state.players[d.seat].cash < total) return state;
  return { ...settle(state, d.seat, d.owed), debt: null, message: `${state.players[d.seat].name} paid ${formatRupees(total)}` };
}

export function expireDebt(state: GameState): GameState {
  const d = state.debt;
  if (!d || state.now < d.endsAt) return state;
  const covered = settleDebtIfCovered(state);
  return covered.debt ? declareBankrupt(covered, d.seat) : covered;
}

// Bankruptcy is immediate and final (also used for "I'm bankrupt and exiting").
// Cash goes to whoever is owed; places go back to the bank, keep their buildings, and are auctioned one by one.
export function declareBankrupt(state: GameState, seat: number): GameState {
  const me = state.players[seat];
  if (me.bankrupt) throw new Error('Already out');
  let s = state;
  // owed player(s) receive all remaining cash first
  if (s.debt && s.debt.seat === seat) {
    let cash = me.cash;
    const paid: { to: number | null; amount: number }[] = [];
    for (const o of s.debt.owed) {
      const amount = o.to === null ? 0 : Math.min(cash, o.amount); // cash owed to the bank is simply lost
      cash -= amount;
      paid.push({ to: o.to, amount });
    }
    s = settle(s, seat, paid);
  }
  const places = ownedTiles(s, seat);
  const properties = { ...s.properties };
  for (const t of places) properties[t] = { ...properties[t], owner: null, mortgaged: false };
  // Get Out of Jail Free cards go back to the bottom of their decks
  const decks = { ...s.decks };
  for (const c of me.heldCards) { const d = cardById(c).deck; decks[d] = [...decks[d], c]; }
  const players = s.players.map((p, i) => (i === seat ? { ...p, bankrupt: true, cash: 0, heldCards: [], inJail: false } : p));
  s = {
    ...s, players, properties, decks,
    auctionQueue: [...s.auctionQueue, ...places],
    debt: s.debt && s.debt.seat === seat ? null : s.debt,
    trade: s.trade && (s.trade.from === seat || s.trade.to === seat) ? null : s.trade,
    buildTile: s.current === seat ? null : s.buildTile,
    message: `${me.name} is bankrupt and out of the game.`,
  };
  if (s.auction && s.auction.bidder === seat) s = { ...s, auction: { ...s.auction, bid: 0, bidder: null } };
  const left = active(s);
  if (left.length <= 1) return { ...s, auctionQueue: [], auction: null, gameOver: { winners: left, reason: 'lastStanding' }, message: `${s.players[left[0]].name} wins!` };
  if (s.current === seat) s = passTurn(s);
  return startNextQueued(s);
}

export const debtTotal = (state: GameState) => (state.debt ? state.debt.owed.reduce((n, o) => n + o.amount, 0) : 0);
export { CONSTANTS };
