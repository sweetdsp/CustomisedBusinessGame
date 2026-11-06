// Net worth (section 32): cash + price of unmortgaged places + mortgage value of mortgaged places + build price of buildings.
import { TILES, propertyOf } from '../shared/board.ts';
import { ownedTiles } from './rent.ts';
import type { GameState } from './types.ts';

export interface NetWorth { cash: number; places: number; buildings: number; total: number }

export function netWorth(state: GameState, seat: number): NetWorth {
  let places = 0, buildings = 0;
  for (const t of ownedTiles(state, seat)) {
    const d = propertyOf(TILES[t])!;
    const ps = state.properties[t];
    places += ps.mortgaged ? d.mortgage : d.price;
    buildings += ps.houses * d.house + (ps.hotel ? d.hotel : 0);
  }
  const cash = state.players[seat].cash;
  return { cash, places, buildings, total: cash + places + buildings };
}
