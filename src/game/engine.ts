// Pure rules for turn order, dice, movement and tile effects (sections 8, 9, 24, 25). No UI imports.
import { CONSTANTS } from '../shared/constants.ts';
import { TILES, propertyOf } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import { rollDice } from './dice.ts';
import { rentFor, luxuryTax, touristTax } from './rent.ts';
import type { GameState, Player, PropertyState, Rng, RollResult } from './types.ts';

export function newGame(seats: { name: string; token: string }[], startingCash: number, rng: Rng): GameState {
  const players: Player[] = seats.map((s) => ({
    ...s, cash: startingCash, position: CONSTANTS.START_TILE, inJail: false, bankrupt: false,
  }));
  const properties: Record<number, PropertyState> = {};
  for (const t of TILES) if (t.kind === 'property') properties[t.index] = { owner: null, mortgaged: false, houses: 0, hotel: false };
  const current = Math.floor(rng() * players.length); // first player chosen at random
  return {
    players, current, phase: 'awaitRoll', doublesCount: 0, extraTurn: false,
    startingCash, lapSalary: CONSTANTS.LAP_SALARY[startingCash], properties, buildTile: null,
    message: `${players[current].name} goes first`,
  };
}

// Interim rule (until stage 8): a player who cannot pay gives all remaining cash and stops at 0.
function pay(state: GameState, from: number, to: number | null, amount: number): { state: GameState; note: string } {
  const paid = Math.min(state.players[from].cash, amount);
  const players = state.players.map((p, i) => {
    if (i === from) return { ...p, cash: p.cash - paid };
    if (i === to) return { ...p, cash: p.cash + paid };
    return p;
  });
  const short = paid < amount ? ` Could not pay all ${formatRupees(amount)}, paid ${formatRupees(paid)} (debt rules come in stage 8).` : '';
  return { state: { ...state, players }, note: short };
}

function resolveLanding(state: GameState, seat: number): { state: GameState; note: string } {
  const me = state.players[seat];
  const tile = TILES[me.position];
  const def = propertyOf(tile);
  switch (tile.kind) {
    case 'property': {
      const ps = state.properties[tile.index];
      if (ps.owner === null) {
        if (me.cash >= def!.price) return { state: { ...state, phase: 'awaitBuy' }, note: `${tile.name} is for sale at ${formatRupees(def!.price)}.` };
        return { state, note: `${tile.name} costs ${formatRupees(def!.price)}, more than ${me.name} has. It stays unowned (auctions come in stage 7).` };
      }
      if (ps.owner === seat) return { state: { ...state, buildTile: tile.index }, note: `${tile.name} is yours. You may build here.` };
      const rent = rentFor(state, tile.index);
      if (rent === 0) return { state, note: `${tile.name} is mortgaged, no rent.` };
      const r = pay(state, seat, ps.owner, rent);
      return { state: r.state, note: `${me.name} pays ${formatRupees(rent)} rent to ${state.players[ps.owner].name}.${r.note}` };
    }
    case 'incomeTax': {
      const r = pay(state, seat, null, CONSTANTS.INCOME_TAX);
      return { state: r.state, note: `Income Tax: ${formatRupees(CONSTANTS.INCOME_TAX)}.${r.note}` };
    }
    case 'luxuryTax': {
      const amt = luxuryTax(state, seat);
      const r = pay(state, seat, null, amt);
      return { state: r.state, note: `Luxury Tax: ${formatRupees(amt)}.${r.note}` };
    }
    case 'touristTax': {
      const amt = touristTax(state, seat);
      const r = pay(state, seat, null, amt);
      return { state: r.state, note: `Tourist Tax: ${formatRupees(amt)}.${r.note}` };
    }
    case 'luckyDraw': {
      const players = state.players.map((p, i) => (i === seat ? { ...p, cash: p.cash + CONSTANTS.LUCKY_DRAW_BONUS } : p));
      return { state: { ...state, players }, note: `Lucky Draw! +${formatRupees(CONSTANTS.LUCKY_DRAW_BONUS)}.` };
    }
    case 'gotojail': {
      // To Jail with no salary; the turn ends even on a double.
      const players = state.players.map((p, i) => (i === seat ? { ...p, position: CONSTANTS.JAIL_TILE, inJail: true } : p));
      return { state: { ...state, players, extraTurn: false }, note: 'Go to Jail!' };
    }
    case 'fortune': case 'festival':
      return { state, note: `${tile.name}: cards come in stage 6.` };
    default: // Start, Jail / Just Visiting, Rest at the Beach
      return { state, note: `${tile.name}.` };
  }
}

export function roll(state: GameState, rng: Rng): { state: GameState; result: RollResult } {
  if (state.phase !== 'awaitRoll') throw new Error('Not time to roll');
  const dice = rollDice(rng);
  const total = dice[0] + dice[1];
  const isDouble = dice[0] === dice[1];
  const doublesCount = isDouble ? state.doublesCount + 1 : 0;
  const seat = state.current;
  const me = state.players[seat];
  const head = `${me.name} rolled ${dice[0]} + ${dice[1]} = ${total}.`;

  if (doublesCount === CONSTANTS.DOUBLES_TO_JAIL) {
    // Third double in a row: no move along the board, straight to Jail, no salary, turn ends.
    const result: RollResult = { dice, total, isDouble, path: [], salaryPaid: 0, toJail: true };
    const players = state.players.map((p, i) => (i === seat ? { ...p, position: CONSTANTS.JAIL_TILE, inJail: true } : p));
    return {
      result,
      state: { ...state, players, phase: 'awaitEnd', doublesCount, extraTurn: false, lastRoll: result, buildTile: null, message: `${head} Three doubles: straight to Jail!` },
    };
  }

  const path: number[] = [];
  let laps = 0;
  for (let i = 1; i <= total; i++) {
    const tile = (me.position + i) % CONSTANTS.TILE_COUNT;
    path.push(tile);
    if (tile === CONSTANTS.START_TILE) laps++; // crossing or landing on Start, once each
  }
  const salaryPaid = laps * state.lapSalary;
  const result: RollResult = { dice, total, isDouble, path, salaryPaid, toJail: false };
  const players = state.players.map((p, i) => (i === seat ? { ...p, position: path[path.length - 1], cash: p.cash + salaryPaid } : p));
  const base: GameState = { ...state, players, phase: 'awaitEnd', doublesCount, extraTurn: isDouble, lastRoll: result, buildTile: null };
  const landed = resolveLanding(base, seat);
  const salary = salaryPaid ? ` Salary +${formatRupees(salaryPaid)}!` : '';
  const dbl = landed.state.extraTurn ? ' Doubles: roll again after ending the turn.' : '';
  return { result, state: { ...landed.state, message: `${head}${salary} ${landed.note}${dbl}` } };
}

export function buy(state: GameState): GameState {
  if (state.phase !== 'awaitBuy') throw new Error('Nothing to buy');
  const seat = state.current;
  const me = state.players[seat];
  const tile = TILES[me.position];
  const def = propertyOf(tile)!;
  if (me.cash < def.price) throw new Error('Not enough cash');
  return {
    ...state, phase: 'awaitEnd',
    players: state.players.map((p, i) => (i === seat ? { ...p, cash: p.cash - def.price } : p)),
    properties: { ...state.properties, [tile.index]: { ...state.properties[tile.index], owner: seat } },
    message: `${me.name} bought ${tile.name} for ${formatRupees(def.price)}!`,
  };
}

export function decline(state: GameState): GameState {
  if (state.phase !== 'awaitBuy') throw new Error('Nothing to decline');
  const tile = TILES[state.players[state.current].position];
  // Interim (until stage 7): a declined place stays unowned instead of going to auction.
  return { ...state, phase: 'awaitEnd', message: `${state.players[state.current].name} passed on ${tile.name}. It stays unowned (auctions come in stage 7).` };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'awaitEnd') throw new Error('Cannot end turn yet');
  if (state.extraTurn) {
    return { ...state, phase: 'awaitRoll', extraTurn: false, buildTile: null, message: `${state.players[state.current].name} rolls again!` };
  }
  let next = state.current;
  do next = (next + 1) % state.players.length; while (state.players[next].bankrupt); // skip bankrupt players
  return {
    ...state, current: next, phase: 'awaitRoll', doublesCount: 0, extraTurn: false, buildTile: null,
    message: `${state.players[next].name}'s turn`,
  };
}
