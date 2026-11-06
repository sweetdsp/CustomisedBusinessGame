// What the game screen needs, whether the game runs on this screen (local) or on the server (online).
import type { Action } from './actions.ts';
import type { GameState } from './types.ts';
import type { ChatMsg } from '../server/types.ts';

export interface GameController {
  state: GameState;
  busy: boolean;
  rolling: boolean;
  shownDice: [number, number] | null;
  shownPos: { seat: number; tile: number } | null;
  message: string;
  now: number; // server clock for online games
  mySeats: number[] | null; // null: this screen controls every human seat (local play)
  chat: { messages: ChatMsg[]; send: (text: string) => void } | null;
  fatal: string | null; // e.g. "session is broken" after a computer took over the seat
  act: (actor: number, action: Action) => Promise<boolean>;
  doRoll: () => void;
  doEndTurn: () => void;
  doBuy: () => void;
  doDecline: () => void;
  doBuild: () => void;
  doMortgage: (tile: number) => void;
  doUnmortgage: (tile: number) => void;
  doSell: (tile: number) => void;
}

export function helpers(act: GameController['act'], cur: () => number) {
  return {
    doRoll: () => void act(cur(), { type: 'roll' }),
    doEndTurn: () => void act(cur(), { type: 'endTurn' }),
    doBuy: () => void act(cur(), { type: 'buy' }),
    doDecline: () => void act(cur(), { type: 'decline' }),
    doBuild: () => void act(cur(), { type: 'build' }),
    doMortgage: (tile: number) => void act(cur(), { type: 'mortgage', tile }),
    doUnmortgage: (tile: number) => void act(cur(), { type: 'unmortgage', tile }),
    doSell: (tile: number) => void act(cur(), { type: 'sell', tile }),
  };
}
