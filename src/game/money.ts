// Paying money (sections 25, 29). If the payer cannot cover it, a 30 second debt window opens.
import { CONSTANTS } from '../shared/constants.ts';
import { formatRupees } from '../shared/design.ts';
import type { GameState } from './types.ts';

export type Owed = { to: number | null; amount: number }; // to = null means the bank

export function credit(state: GameState, seat: number, amount: number): GameState {
  return { ...state, players: state.players.map((p, i) => (i === seat ? { ...p, cash: p.cash + amount } : p)) };
}

// Hand over amounts at once (cash must already cover them).
export function settle(state: GameState, from: number, owed: Owed[]): GameState {
  const total = owed.reduce((n, o) => n + o.amount, 0);
  return {
    ...state,
    players: state.players.map((p, i) => {
      let cash = p.cash;
      if (i === from) cash -= total;
      for (const o of owed) if (o.to === i) cash += o.amount;
      return cash === p.cash ? p : { ...p, cash };
    }),
  };
}

// Pay now if possible; otherwise the player gets 30 seconds to raise the money by mortgaging or selling.
export function charge(state: GameState, from: number, owed: Owed[], reason = 'a payment'): { state: GameState; note: string } {
  const total = owed.reduce((n, o) => n + o.amount, 0);
  if (total === 0) return { state, note: '' };
  const extra = state.debt && state.debt.seat === from ? state.debt.owed : [];
  const all = [...extra, ...owed];
  const allTotal = all.reduce((n, o) => n + o.amount, 0);
  if (state.players[from].cash >= allTotal) return { state: settle({ ...state, debt: extra.length ? null : state.debt }, from, all), note: '' };
  const debt = { seat: from, owed: all, endsAt: state.debt?.seat === from ? state.debt.endsAt : state.now + CONSTANTS.DEBT_GRACE_SECONDS * 1000, reason };
  return {
    state: { ...state, debt },
    note: ` ${state.players[from].name} must raise ${formatRupees(allTotal)} (mortgage or sell) within ${CONSTANTS.DEBT_GRACE_SECONDS} seconds, or goes bankrupt.`,
  };
}

export const pay = (state: GameState, from: number, to: number | null, amount: number) => charge(state, from, [{ to, amount }]);

// A player who owes while it is not their turn (cards that collect from everyone) pays what they have.
export function payUpTo(state: GameState, from: number, to: number, amount: number): { state: GameState; note: string } {
  const paid = Math.min(state.players[from].cash, amount);
  const note = paid < amount ? ` ${state.players[from].name} could only pay ${formatRupees(paid)}.` : '';
  return { state: settle(state, from, [{ to, amount: paid }]), note };
}
