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

// Grid cell (1-based) on the 12 column by 11 row board. Start is bottom right, clockwise.
export function gridCell(i: number): { row: number; col: number } {
  if (i <= 11) return { row: 11, col: 12 - i };
  if (i <= 20) return { row: 22 - i, col: 1 };
  if (i <= 32) return { row: 1, col: i - 20 };
  return { row: i - 31, col: 12 };
}

export const CORNER_TILES = [0, 11, 21, 32];
