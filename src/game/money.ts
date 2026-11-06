import { formatRupees } from '../shared/design.ts';
import type { GameState } from './types.ts';

// Interim rule (until stage 8): a player who cannot pay gives all remaining cash and stops at 0.
export function pay(state: GameState, from: number, to: number | null, amount: number): { state: GameState; note: string } {
  const paid = Math.min(state.players[from].cash, amount);
  const players = state.players.map((p, i) => {
    if (i === from) return { ...p, cash: p.cash - paid };
    if (i === to) return { ...p, cash: p.cash + paid };
    return p;
  });
  const short = paid < amount ? ` ${state.players[from].name} could not pay all ${formatRupees(amount)}, paid ${formatRupees(paid)} (debt rules come in stage 8).` : '';
  return { state: { ...state, players }, note: short };
}

export function credit(state: GameState, seat: number, amount: number): GameState {
  return { ...state, players: state.players.map((p, i) => (i === seat ? { ...p, cash: p.cash + amount } : p)) };
}
