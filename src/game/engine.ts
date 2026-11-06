// Pure rules for turn order, dice and movement (sections 8 and 24). No UI imports.
import { CONSTANTS } from '../shared/constants.ts';
import { rollDice } from './dice.ts';
import type { GameState, Player, Rng, RollResult } from './types.ts';

export function newGame(seats: { name: string; token: string }[], startingCash: number, rng: Rng): GameState {
  const players: Player[] = seats.map((s) => ({
    ...s, cash: startingCash, position: CONSTANTS.START_TILE, inJail: false, bankrupt: false,
  }));
  const current = Math.floor(rng() * players.length); // first player chosen at random
  return {
    players, current, phase: 'awaitRoll', doublesCount: 0, extraTurn: false,
    startingCash, lapSalary: CONSTANTS.LAP_SALARY[startingCash],
    message: `${players[current].name} goes first`,
  };
}

export function roll(state: GameState, rng: Rng): { state: GameState; result: RollResult } {
  if (state.phase !== 'awaitRoll') throw new Error('Not time to roll');
  const dice = rollDice(rng);
  const total = dice[0] + dice[1];
  const isDouble = dice[0] === dice[1];
  const doublesCount = isDouble ? state.doublesCount + 1 : 0;
  const me = state.players[state.current];

  let result: RollResult;
  let moved: Player;
  if (doublesCount === CONSTANTS.DOUBLES_TO_JAIL) {
    // Third double in a row: no move along the board, straight to Jail, no salary, turn ends.
    result = { dice, total, isDouble, path: [], salaryPaid: 0, toJail: true };
    moved = { ...me, position: CONSTANTS.JAIL_TILE, inJail: true };
  } else {
    const path: number[] = [];
    let laps = 0;
    for (let i = 1; i <= total; i++) {
      const tile = (me.position + i) % CONSTANTS.TILE_COUNT;
      path.push(tile);
      if (tile === CONSTANTS.START_TILE) laps++; // crossing or landing on Start, once each
    }
    result = { dice, total, isDouble, path, salaryPaid: laps * state.lapSalary, toJail: false };
    moved = { ...me, position: path[path.length - 1], cash: me.cash + result.salaryPaid };
  }

  const players = state.players.map((p, i) => (i === state.current ? moved : p));
  return {
    result,
    state: {
      ...state, players, phase: 'awaitEnd', doublesCount,
      extraTurn: isDouble && !result.toJail, lastRoll: result,
      message: `${me.name} rolled ${dice[0]} + ${dice[1]} = ${total}`,
    },
  };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'awaitEnd') throw new Error('Cannot end turn yet');
  if (state.extraTurn) {
    return { ...state, phase: 'awaitRoll', extraTurn: false, message: `${state.players[state.current].name} rolls again!` };
  }
  let next = state.current;
  do next = (next + 1) % state.players.length; while (state.players[next].bankrupt); // skip bankrupt players
  return {
    ...state, current: next, phase: 'awaitRoll', doublesCount: 0, extraTurn: false,
    message: `${state.players[next].name}'s turn`,
  };
}
