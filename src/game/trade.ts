// Trading (section 30). Pure; time comes from state.now (ms).
import { CONSTANTS } from '../shared/constants.ts';
import { TILES } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import type { Bundle, GameState } from './types.ts';

export const emptyBundle = (): Bundle => ({ cash: 0, tiles: [], cards: [] });
const isEmpty = (b: Bundle) => b.cash === 0 && b.tiles.length === 0 && b.cards.length === 0;

// Why a trade cannot be proposed or completed (undefined when it is fine).
export function tradeProblem(state: GameState, from: number, to: number, give: Bundle, get: Bundle): string | undefined {
  const a = state.players[from], b = state.players[to];
  if (!a || !b || a.bankrupt || b.bankrupt || from === to) return 'Pick another player';
  if (isEmpty(give) && isEmpty(get)) return 'Offer at least one item';
  if (give.cash < 0 || get.cash < 0) return 'Bad amount';
  if (give.cash > a.cash) return `${a.name} does not have that much cash`;
  if (get.cash > b.cash) return `${b.name} does not have that much cash`;
  const check = (who: number, bundle: Bundle) => {
    for (const t of bundle.tiles) {
      const ps = state.properties[t];
      if (!ps || ps.owner !== who) return `${TILES[t]?.name ?? 'A place'} is not owned by ${state.players[who].name}`;
      if (ps.houses > 0 || ps.hotel) return `${TILES[t].name} has buildings and cannot be traded`;
    }
    for (const c of bundle.cards) if (!state.players[who].heldCards.includes(c)) return 'Card not held';
    return undefined;
  };
  return check(from, give) ?? check(to, get);
}

export function proposeTrade(state: GameState, from: number, to: number, give: Bundle, get: Bundle): GameState {
  if (from !== state.current) throw new Error('Only the player whose turn it is can propose a trade');
  if (state.phase === 'awaitBuy') throw new Error('Answer the purchase first');
  if (state.auction || state.trade || state.debt) throw new Error('Finish what is open first');
  if (state.tradesThisTurn >= CONSTANTS.TRADES_PER_TURN) throw new Error('At most three trades per turn');
  const problem = tradeProblem(state, from, to, give, get);
  if (problem) throw new Error(problem);
  return {
    ...state, tradesThisTurn: state.tradesThisTurn + 1,
    trade: { from, to, give, get, endsAt: state.now + CONSTANTS.TRADE_ANSWER_SECONDS * 1000 },
    message: `${state.players[from].name} offers ${state.players[to].name} a trade`,
  };
}

export function answerTrade(state: GameState, accept: boolean): GameState {
  const t = state.trade;
  if (!t) throw new Error('No trade open');
  const names = `${state.players[t.from].name} and ${state.players[t.to].name}`;
  if (!accept) return { ...state, trade: null, message: `${state.players[t.to].name} declined the trade` };
  // The server checks ownership and cash again before completing.
  const problem = tradeProblem(state, t.from, t.to, t.give, t.get);
  if (problem) return { ...state, trade: null, message: `Trade cancelled: ${problem}` };
  const properties = { ...state.properties };
  for (const x of t.give.tiles) properties[x] = { ...properties[x], owner: t.to };
  for (const x of t.get.tiles) properties[x] = { ...properties[x], owner: t.from };
  const players = state.players.map((p, i) => {
    if (i === t.from) return { ...p, cash: p.cash - t.give.cash + t.get.cash, heldCards: [...p.heldCards.filter((c) => !t.give.cards.includes(c)), ...t.get.cards] };
    if (i === t.to) return { ...p, cash: p.cash + t.give.cash - t.get.cash, heldCards: [...p.heldCards.filter((c) => !t.get.cards.includes(c)), ...t.give.cards] };
    return p;
  });
  const lost = state.buildTile !== null && t.give.tiles.includes(state.buildTile);
  return { ...state, players, properties, trade: null, buildTile: lost ? null : state.buildTile, message: `Trade done between ${names}!` };
}

// No answer in time counts as declined.
export function expireTrade(state: GameState): GameState {
  if (!state.trade || state.now < state.trade.endsAt) return state;
  return { ...state, trade: null, message: `${state.players[state.trade.to].name} did not answer: trade declined` };
}

export const describeBundle = (b: Bundle): string => {
  const parts: string[] = [];
  if (b.cash) parts.push(formatRupees(b.cash));
  for (const t of b.tiles) parts.push(TILES[t].name);
  if (b.cards.length) parts.push(`${b.cards.length} Get Out of Jail Free`);
  return parts.length ? parts.join(', ') : 'nothing';
};
