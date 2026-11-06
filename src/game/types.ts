export type Rng = () => number; // returns [0, 1); injected so the server can supply its own

export interface Player {
  name: string;
  token: string;
  cash: number;
  position: number;
  inJail: boolean;
  bankrupt: boolean;
  heldCards: string[]; // Get Out of Jail Free card ids kept until used
  jailTurns: number; // failed turns spent in Jail
  ai?: 'Easy' | 'Medium' | 'High'; // computer players only
  connected: boolean; // online play: false while a human has dropped
  missedTurns: number; // consecutive turns that timed out
  droppedRounds: number; // turns skipped since the player dropped (online play)
  replaced?: boolean; // a computer took over this seat after three rounds away
}

export type Bundle = { cash: number; tiles: number[]; cards: string[] };

export interface Auction {
  tile: number;
  bid: number; // 0 until the first bid
  bidder: number | null;
  endsAt: number; // server clock, ms
}

export interface Trade {
  from: number;
  to: number;
  give: Bundle; // what `from` offers
  get: Bundle; // what `from` asks for
  endsAt: number;
}

export interface Debt {
  seat: number;
  owed: { to: number | null; amount: number }[]; // null = bank
  endsAt: number;
  reason: string;
}

export type EndMode = { kind: 'lastStanding' } | { kind: 'timed'; minutes: number };

export interface GameOver {
  winners: number[]; // more than one means a shared win
  reason: 'lastStanding' | 'time';
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
  cardPath?: number[]; // extra tiles hopped because of a card move
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
  buildTile: number | null; // own place just landed on; the only tile you may build on right now
  decks: Record<'fortune' | 'festival', string[]>; // card ids, top first
  lastCard?: { deck: 'fortune' | 'festival'; id: string }; // shown in the centre until the next action
  now: number; // server clock (ms), set before every action
  auction: Auction | null;
  auctionQueue: number[]; // further places waiting to be auctioned (after a bankruptcy)
  trade: Trade | null;
  tradesThisTurn: number;
  debt: Debt | null;
  endMode: EndMode;
  startedAt: number;
  gameOver: GameOver | null;
  turnEndsAt: number | null; // online play: when the 10 second turn timer runs out
  turnTimedOut: boolean; // this turn has already timed out once
  lastRoll?: RollResult;
  message: string;
}
