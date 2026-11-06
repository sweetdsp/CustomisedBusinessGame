export type Rng = () => number; // returns [0, 1); injected so the server can supply its own

export interface Player {
  name: string;
  token: string;
  cash: number;
  position: number;
  inJail: boolean;
  bankrupt: boolean;
}

export type Phase = 'awaitRoll' | 'awaitEnd';

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
  lastRoll?: RollResult;
  message: string;
}
