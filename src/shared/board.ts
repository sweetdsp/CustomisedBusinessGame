// Board layout: 42 tiles in the exact section 23 order. Prices come from constants.ts.
import { PROPERTIES } from './constants.ts';
import type { PropertyDef, StateId } from './types.ts';

export type TileKind =
  | 'start' | 'jail' | 'rest' | 'gotojail'
  | 'fortune' | 'festival'
  | 'incomeTax' | 'luxuryTax' | 'touristTax' | 'luckyDraw'
  | 'property';

export interface Tile {
  index: number;
  name: string;
  kind: TileKind;
  state?: StateId;
  icon: string; // placeholder emoji; real art arrives in stage 11
}

const P = (name: string, state: StateId, icon: string): Omit<Tile, 'index'> => ({ name, kind: 'property', state, icon });
const S = (name: string, kind: TileKind, icon: string): Omit<Tile, 'index'> => ({ name, kind, icon });

const ORDER: Omit<Tile, 'index'>[] = [
  S('Start', 'start', '🪔'),
  P('Vemulawada', 'TG', '🛕'), S('Festival', 'festival', '🎊'), P('Ramappa', 'TG', '🛕'),
  P('Basar', 'TG', '📚'), S('Income Tax', 'incomeTax', '🧾'), P('Yadagirigutta', 'TG', '⛰️'),
  P('Warangal', 'TG', '🏰'), P('Bhadrachalam', 'TG', '🛕'),
  P('Courtallam', 'TN', '💦'), P('Mahabalipuram', 'TN', '🗿'),
  S('Jail / Just Visiting', 'jail', '🔒'),
  P('Kanyakumari', 'TN', '🌅'), S('Fortune', 'fortune', '🎴'), P('Rameswaram', 'TN', '🌉'),
  P('Ooty', 'TN', '🚂'), P('Kodaikanal', 'TN', '🌲'), S('Luxury Tax', 'luxuryTax', '💎'),
  P('Wayanad', 'KL', '🌿'), P('Alleppey', 'KL', '🛶'), P('Kumarakom', 'KL', '🦆'),
  S('Rest at the Beach', 'rest', '🏖️'),
  S('Festival', 'festival', '🎊'), P('Varkala', 'KL', '🌊'), P('Thekkady', 'KL', '🐘'), P('Munnar', 'KL', '🍵'),
  S('Lucky Draw', 'luckyDraw', '🎁'),
  P('Badami', 'KA', '🪨'), P('Chikmagalur', 'KA', '☕'), P('Udupi', 'KA', '🛕'),
  P('Gokarna', 'KA', '🏝️'), P('Coorg', 'KA', '🌳'),
  S('Go to Jail', 'gotojail', '👮'),
  P('Hampi', 'KA', '🏛️'), S('Tourist Tax', 'touristTax', '🧳'),
  P('Nagarjuna Sagar', 'AP', '🏞️'), P('Lepakshi', 'AP', '🐂'), S('Fortune', 'fortune', '🎴'),
  P('Puttaparthi', 'AP', '🙏'), P('Srisailam', 'AP', '🛕'), P('Araku', 'AP', '⛰️'), P('Tirupati', 'AP', '🛕'),
];

export const TILES: Tile[] = ORDER.map((t, index) => ({ index, ...t }));

export function propertyOf(tile: Tile): PropertyDef | undefined {
  return tile.kind === 'property' ? PROPERTIES.find((p) => p.name === tile.name) : undefined;
}

// The path is a closed loop through a 7 column by 6 row grid, so every tile is large and each step goes to a neighbouring tile.
// Tile 0 (Start) is the top-left cell. The path runs along the top row, snakes down through the middle, then climbs the left column back to Start.
export const GRID_COLS = 7;
export const GRID_ROWS = 6;

// Grid cell (1-based) for a tile index.
export function gridCell(i: number): { row: number; col: number } {
  if (i <= 6) return { row: 1, col: i + 1 };                    // top row, left to right
  if (i <= 36) {                                                  // rows 2 to 6 snake through columns 2 to 7
    const k = i - 7, rowIdx = Math.floor(k / 6), pos = k % 6;
    const leftToRight = rowIdx % 2 === 1;
    return { row: rowIdx + 2, col: leftToRight ? pos + 2 : 7 - pos };
  }
  return { row: 6 - (i - 37), col: 1 };                           // left column, bottom to top (rows 6 to 2)
}

// Arrow showing which way the path goes next from a tile.
export function flowArrow(i: number): string {
  const a = gridCell(i), b = gridCell((i + 1) % 42);
  return b.col > a.col ? '→' : b.col < a.col ? '←' : b.row > a.row ? '↓' : '↑';
}

// The four special corner tiles keep their special look (Start, Jail, Rest at the Beach, Go to Jail).
export const CORNER_TILES = [0, 11, 21, 32];
