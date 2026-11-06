// Building, mortgage and selling (sections 10, 25, 27). Pure; no UI imports.
import { CONSTANTS } from '../shared/constants.ts';
import { TILES, propertyOf } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import type { GameState } from './types.ts';

export type Check = { ok: true; cost: number; label: string } | { ok: false; reason: string };

const def = (tile: number) => propertyOf(TILES[tile])!;
const percent = (amount: number, pct: number) => (amount * pct) / 100;

function setProp(state: GameState, tile: number, patch: Partial<GameState['properties'][number]>, cashDelta: number, message: string): GameState {
  return {
    ...state, message,
    players: state.players.map((p, i) => (i === state.current ? { ...p, cash: p.cash + cashDelta } : p)),
    properties: { ...state.properties, [tile]: { ...state.properties[tile], ...patch } },
  };
}

const mine = (state: GameState, tile: number) => state.properties[tile]?.owner === state.current;

// Build: only on the own place just landed on; one house (or the hotel) per landing.
export function checkBuild(state: GameState): Check {
  const t = state.buildTile;
  if (t === null) return { ok: false, reason: 'Land on your own place first' };
  const ps = state.properties[t];
  if (!mine(state, t)) return { ok: false, reason: 'Not your place' };
  if (ps.mortgaged) return { ok: false, reason: 'Place is mortgaged' };
  const cash = state.players[state.current].cash;
  if (ps.hotel) return { ok: false, reason: 'Hotel already built' };
  if (ps.houses < CONSTANTS.MAX_HOUSES) {
    const cost = def(t).house;
    return cash >= cost ? { ok: true, cost, label: 'house' } : { ok: false, reason: `Needs ${formatRupees(cost)}` };
  }
  const cost = def(t).hotel;
  return cash >= cost ? { ok: true, cost, label: 'hotel' } : { ok: false, reason: `Needs ${formatRupees(cost)}` };
}

export function build(state: GameState): GameState {
  const c = checkBuild(state);
  if (!c.ok) throw new Error(c.reason);
  const t = state.buildTile!;
  const ps = state.properties[t];
  const name = TILES[t].name;
  const patch = c.label === 'hotel' ? { hotel: true } : { houses: ps.houses + 1 };
  return { ...setProp(state, t, patch, -c.cost, `Built a ${c.label} on ${name} for ${formatRupees(c.cost)}!`), buildTile: null };
}

export function checkMortgage(state: GameState, tile: number): Check {
  const ps = state.properties[tile];
  if (!mine(state, tile)) return { ok: false, reason: 'Not your place' };
  if (ps.mortgaged) return { ok: false, reason: 'Already mortgaged' };
  if (ps.houses > 0 || ps.hotel) return { ok: false, reason: 'Sell its buildings first' };
  return { ok: true, cost: -def(tile).mortgage, label: 'mortgage' };
}

export function mortgage(state: GameState, tile: number): GameState {
  const c = checkMortgage(state, tile);
  if (!c.ok) throw new Error(c.reason);
  return setProp(state, tile, { mortgaged: true }, def(tile).mortgage, `Mortgaged ${TILES[tile].name} for ${formatRupees(def(tile).mortgage)}.`);
}

// Mortgage value plus 10% of the price, total rounded to the nearest 100.
export function unmortgageCost(tile: number): number {
  const d = def(tile);
  const raw = d.mortgage + percent(d.price, CONSTANTS.UNMORTGAGE_FEE_PERCENT);
  return Math.round(raw / CONSTANTS.UNMORTGAGE_ROUND_TO) * CONSTANTS.UNMORTGAGE_ROUND_TO;
}

export function checkUnmortgage(state: GameState, tile: number): Check {
  const ps = state.properties[tile];
  if (!mine(state, tile)) return { ok: false, reason: 'Not your place' };
  if (!ps.mortgaged) return { ok: false, reason: 'Not mortgaged' };
  const cost = unmortgageCost(tile);
  return state.players[state.current].cash >= cost ? { ok: true, cost, label: 'unmortgage' } : { ok: false, reason: `Needs ${formatRupees(cost)}` };
}

export function unmortgage(state: GameState, tile: number): GameState {
  const c = checkUnmortgage(state, tile);
  if (!c.ok) throw new Error(c.reason);
  return setProp(state, tile, { mortgaged: false }, -c.cost, `Unmortgaged ${TILES[tile].name} for ${formatRupees(c.cost)}.`);
}

// The hotel is sold before any house; the bank pays 50% of the build price.
export function checkSell(state: GameState, tile: number): Check {
  const ps = state.properties[tile];
  if (!mine(state, tile)) return { ok: false, reason: 'Not your place' };
  if (ps.hotel) return { ok: true, cost: percent(def(tile).hotel, CONSTANTS.BUILDING_BUYBACK_PERCENT), label: 'hotel' };
  if (ps.houses > 0) return { ok: true, cost: percent(def(tile).house, CONSTANTS.BUILDING_BUYBACK_PERCENT), label: 'house' };
  return { ok: false, reason: 'No buildings' };
}

export function sellBuilding(state: GameState, tile: number): GameState {
  const c = checkSell(state, tile);
  if (!c.ok) throw new Error(c.reason);
  const ps = state.properties[tile];
  const patch = c.label === 'hotel' ? { hotel: false } : { houses: ps.houses - 1 };
  return setProp(state, tile, patch, c.cost, `Sold a ${c.label} on ${TILES[tile].name} for ${formatRupees(c.cost)}.`);
}
