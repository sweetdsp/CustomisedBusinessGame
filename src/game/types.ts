export type Rng = () => number; // returns [0, 1); injected so the server can supply its own

export interface Player {
  name: string;
  token: string;
  cash: number;
  position: number;
  inJail: boolean;
  bankrupt: boolean;
}

export type Phase = 'awaitRoll' | 'awaitBuy' | 'awaitEnd';

export interface PropertyState {
  owner: number | null; // seat index
  mortgaged: boolean;
  houses: number; // 0-3; stays 3 when a hotel is added on top
  hotel: boolean;
}

export interface RollResult {
  dice: [number, number];
  total: number;
  isDouble: boolean;
  path: number[]; // tiles stepped on, in order (empty when sent to Jail)
  salaryPaid: number;
  toJail: boolean;
}

export interface GameState {
  players: Player[];
  current: number;
  phase: Phase;
  doublesCount: number;
  extraTurn: boolean; // a double was rolled, same player rolls again after End Turn
  startingCash: number;
  lapSalary: number;
  properties: Record<number, PropertyState>; // keyed by tile index, property tiles only
  lastRoll?: RollResult;
  message: string;
}
