// Pure money formulas (sections 7, 9, 25). No UI imports.
import { CONSTANTS } from '../shared/constants.ts';
import { TILES, propertyOf } from '../shared/board.ts';
import type { GameState } from './types.ts';

export function ownedTiles(state: GameState, seat: number): number[] {
  return Object.entries(state.properties).filter(([, p]) => p.owner === seat).map(([i]) => Number(i));
}

// Base rent doubles when the owner holds 3+ unmortgaged places of the state, only while this place has no buildings.
export function rentFor(state: GameState, tile: number): number {
  const ps = state.properties[tile];
  const def = propertyOf(TILES[tile]);
  if (!ps || ps.owner === null || !def || ps.mortgaged) return 0;
  if (ps.hotel) return def.rentHotel;
  if (ps.houses === 1) return def.rent1;
  if (ps.houses === 2) return def.rent2;
  if (ps.houses === 3) return def.rent3;
  const sameState = ownedTiles(state, ps.owner).filter(
    (t) => TILES[t].state === def.state && !state.properties[t].mortgaged,
  );
  return sameState.length >= CONSTANTS.DOUBLED_RENT_MIN_PLACES ? def.baseRent * 2 : def.baseRent;
}

export function luxuryTax(state: GameState, seat: number): number {
  let total = 0;
  for (const t of ownedTiles(state, seat)) {
    const ps = state.properties[t];
    total += ps.mortgaged ? CONSTANTS.LUXURY_TAX_PER_MORTGAGED_PLACE : CONSTANTS.LUXURY_TAX_PER_PLACE;
    total += ps.houses * CONSTANTS.LUXURY_TAX_PER_HOUSE + (ps.hotel ? CONSTANTS.LUXURY_TAX_PER_HOTEL : 0);
  }
  return total;
}

export function touristTax(state: GameState, seat: number): number {
  return Math.min(ownedTiles(state, seat).length * CONSTANTS.TOURIST_TAX_PER_PLACE, CONSTANTS.TOURIST_TAX_MAX);
}
