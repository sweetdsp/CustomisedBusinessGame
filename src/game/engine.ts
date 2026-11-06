// Pure rules for turn order, dice, movement and tile effects (sections 8, 9, 24, 25). No UI imports.
import { CONSTANTS } from '../shared/constants.ts';
import { TILES, propertyOf } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import { rollDice } from './dice.ts';
import { rentFor, luxuryTax, touristTax } from './rent.ts';
import { pay } from './money.ts';
import { shuffleDecks, drawCard, applyCard } from './cards.ts';
import { startAuction } from './auction.ts';
import { passTurn } from './endgame.ts';
import { cardById } from '../shared/cards.ts';
import type { EndMode, GameState, Player, PropertyState, Rng, RollResult } from './types.ts';

type Landed = { state: GameState; note: string; path?: number[] };

export function newGame(
  seats: { name: string; token: string; ai?: Player['ai'] }[], startingCash: number, rng: Rng,
  options: { endMode?: EndMode; now?: number } = {},
): GameState {
  const players: Player[] = seats.map((s) => ({
    ...s, cash: startingCash, position: CONSTANTS.START_TILE, inJail: false, bankrupt: false, heldCards: [], jailTurns: 0, connected: true, missedTurns: 0, droppedRounds: 0,
  }));
  const properties: Record<number, PropertyState> = {};
  for (const t of TILES) if (t.kind === 'property') properties[t.index] = { owner: null, mortgaged: false, houses: 0, hotel: false };
  const current = Math.floor(rng() * players.length); // first player chosen at random
  return {
    players, current, phase: 'awaitRoll', doublesCount: 0, extraTurn: false,
    startingCash, lapSalary: CONSTANTS.LAP_SALARY[startingCash], properties, buildTile: null, decks: shuffleDecks(rng),
    now: options.now ?? 0, auction: null, auctionQueue: [], trade: null, tradesThisTurn: 0, debt: null,
    endMode: options.endMode ?? { kind: 'lastStanding' }, startedAt: options.now ?? 0, gameOver: null,
    message: `${players[current].name} goes first`,
  };
}

function resolveLanding(state: GameState, seat: number): Landed {
  const me = state.players[seat];
  const tile = TILES[me.position];
  const def = propertyOf(tile);
  switch (tile.kind) {
    case 'property': {
      const ps = state.properties[tile.index];
      if (ps.owner === null) {
        if (me.cash >= def!.price) return { state: { ...state, phase: 'awaitBuy' }, note: `${tile.name} is for sale at ${formatRupees(def!.price)}.` };
        {
          const a = startAuction(state, tile.index);
          return { state: a.state, note: `${tile.name} costs ${formatRupees(def!.price)}, more than ${me.name} has. ${a.started ? 'It goes to auction!' : 'Nobody can bid, so it stays unowned.'}` };
        }
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
    case 'fortune': case 'festival': {
      const drawn = drawCard(state, tile.kind);
      const a = applyCard(drawn.state, seat, drawn.card, resolveLanding);
      return {
        state: { ...a.state, lastCard: { deck: tile.kind, id: drawn.card.id } },
        note: `${tile.name} card: ${drawn.card.text}${a.note}`,
        path: a.path,
      };
    }
    default: // Start, Jail / Just Visiting, Rest at the Beach
      return { state, note: `${tile.name}.` };
  }
}

export function roll(state: GameState, rng: Rng): { state: GameState; result: RollResult } {
  if (state.phase !== 'awaitRoll') throw new Error('Not time to roll');
  const dice = rollDice(rng);
  const total = dice[0] + dice[1];
  const isDouble = dice[0] === dice[1];
  const seat = state.current;
  const me = state.players[seat];
  const head = `${me.name} rolled ${dice[0]} + ${dice[1]} = ${total}.`;
  const wasInJail = me.inJail;
  let work: GameState = state;
  let jailNote = '';

  if (wasInJail) {
    if (!isDouble) {
      const failed = me.jailTurns + 1;
      if (failed < CONSTANTS.JAIL_MAX_TURNS) {
        // Stays in Jail, turn ends.
        const result: RollResult = { dice, total, isDouble, path: [], salaryPaid: 0, toJail: false };
        const players = state.players.map((p, i) => (i === seat ? { ...p, jailTurns: failed } : p));
        return { result, state: { ...state, players, phase: 'awaitEnd', doublesCount: 0, extraTurn: false, lastRoll: result, buildTile: null, lastCard: undefined, message: `${head} No double: ${me.name} stays in Jail (${failed} of ${CONSTANTS.JAIL_MAX_TURNS}).` } };
      }
      // Third failed turn: pay the fine now, then move by the total.
      const f = pay(state, seat, null, CONSTANTS.JAIL_FINE);
      work = f.state;
      jailNote = ` Third turn in Jail: fine ${formatRupees(CONSTANTS.JAIL_FINE)} paid.${f.note}`;
    } else {
      jailNote = ' Doubles: out of Jail!';
    }
    work = { ...work, players: work.players.map((p, i) => (i === seat ? { ...p, inJail: false, jailTurns: 0 } : p)) };
  }

  // A double rolled to leave Jail gives no extra turn, and does not count toward three doubles.
  const countsAsDouble = isDouble && !wasInJail;
  const doublesCount = countsAsDouble ? state.doublesCount + 1 : 0;

  if (doublesCount === CONSTANTS.DOUBLES_TO_JAIL) {
    // Third double in a row: no move along the board, straight to Jail, no salary, turn ends.
    const result: RollResult = { dice, total, isDouble, path: [], salaryPaid: 0, toJail: true };
    const players = work.players.map((p, i) => (i === seat ? { ...p, position: CONSTANTS.JAIL_TILE, inJail: true, jailTurns: 0 } : p));
    return {
      result,
      state: { ...work, players, phase: 'awaitEnd', doublesCount, extraTurn: false, lastRoll: result, buildTile: null, message: `${head} Three doubles: straight to Jail!` },
    };
  }

  const here = work.players[seat];
  const path: number[] = [];
  let laps = 0;
  for (let i = 1; i <= total; i++) {
    const tile = (here.position + i) % CONSTANTS.TILE_COUNT;
    path.push(tile);
    if (tile === CONSTANTS.START_TILE) laps++; // crossing or landing on Start, once each
  }
  const salaryPaid = laps * state.lapSalary;
  const result: RollResult = { dice, total, isDouble, path, salaryPaid, toJail: false };
  const players = work.players.map((p, i) => (i === seat ? { ...p, position: path[path.length - 1], cash: p.cash + salaryPaid } : p));
  const base: GameState = { ...work, players, phase: 'awaitEnd', doublesCount, extraTurn: countsAsDouble, lastRoll: result, buildTile: null };
  const landed = resolveLanding({ ...base, lastCard: undefined }, seat);
  if (landed.path) result.cardPath = landed.path;
  const salary = salaryPaid ? ` Salary +${formatRupees(salaryPaid)}!` : '';
  const dbl = landed.state.extraTurn ? ' Doubles: roll again after ending the turn.' : '';
  return { result, state: { ...landed.state, message: `${head}${jailNote}${salary} ${landed.note}${dbl}` } };
}

// Jail turn choices before rolling (section 31): pay the fine, or use a Get Out of Jail Free card, then roll and move normally.
export function payJailFine(state: GameState): GameState {
  const me = state.players[state.current];
  if (!me.inJail || state.phase !== 'awaitRoll') throw new Error('Not in Jail');
  if (me.cash < CONSTANTS.JAIL_FINE) throw new Error(`Needs ${formatRupees(CONSTANTS.JAIL_FINE)}`);
  const r = pay(state, state.current, null, CONSTANTS.JAIL_FINE);
  return { ...r.state, players: r.state.players.map((p, i) => (i === state.current ? { ...p, inJail: false, jailTurns: 0 } : p)), message: `${me.name} paid the ${formatRupees(CONSTANTS.JAIL_FINE)} fine and is out of Jail. Roll!` };
}

export function useJailCard(state: GameState): GameState {
  const me = state.players[state.current];
  if (!me.inJail || state.phase !== 'awaitRoll') throw new Error('Not in Jail');
  if (me.heldCards.length === 0) throw new Error('No Get Out of Jail Free card');
  const [card, ...rest] = me.heldCards;
  const deck = cardById(card).deck;
  return {
    ...state,
    decks: { ...state.decks, [deck]: [...state.decks[deck], card] }, // returns to the bottom of its deck
    players: state.players.map((p, i) => (i === state.current ? { ...p, inJail: false, jailTurns: 0, heldCards: rest } : p)),
    message: `${me.name} used a Get Out of Jail Free card. Roll!`,
  };
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
  const me = state.players[state.current];
  const tile = TILES[me.position];
  const a = startAuction(state, tile.index);
  return { ...a.state, phase: 'awaitEnd', message: `${me.name} passed on ${tile.name}. ${a.started ? 'It goes to auction!' : 'Nobody can bid, so it stays unowned.'}` };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'awaitEnd') throw new Error('Cannot end turn yet');
  if (state.extraTurn) {
    return { ...state, phase: 'awaitRoll', extraTurn: false, buildTile: null, lastCard: undefined, message: `${state.players[state.current].name} rolls again!` };
  }
  return passTurn(state);
}
