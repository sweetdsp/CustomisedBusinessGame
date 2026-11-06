// Fortune and Festival decks and card effects (sections 14, 25, 34). Pure; no UI imports.
import { CONSTANTS } from '../shared/constants.ts';
import { TILES } from '../shared/board.ts';
import { CARDS, cardById, type CardDef, type DeckId } from '../shared/cards.ts';
import { formatRupees } from '../shared/design.ts';
import { credit, pay } from './money.ts';
import { ownedTiles } from './rent.ts';
import type { GameState, Rng } from './types.ts';

export type Landing = (state: GameState, seat: number) => { state: GameState; note: string; path?: number[] };

export function shuffleDecks(rng: Rng): GameState['decks'] {
  const shuffled = (deck: DeckId) => {
    const ids = CARDS.filter((c) => c.deck === deck).map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  };
  return { fortune: shuffled('fortune'), festival: shuffled('festival') };
}

// Take the top card. It goes to the bottom, except Get Out of Jail Free, which the player keeps.
export function drawCard(state: GameState, deck: DeckId): { state: GameState; card: CardDef } {
  const [top, ...rest] = state.decks[deck];
  const card = cardById(top);
  const keep = card.effect.kind === 'jailFree';
  return { state: { ...state, decks: { ...state.decks, [deck]: keep ? rest : [...rest, top] } }, card };
}

const stepsForward = (from: number, to: number) => (to - from + CONSTANTS.TILE_COUNT) % CONSTANTS.TILE_COUNT || CONSTANTS.TILE_COUNT;

// Move forward to a tile, hopping each tile; lap salary each time tile 0 is crossed or landed on.
function moveForward(state: GameState, seat: number, to: number) {
  const from = state.players[seat].position;
  const path: number[] = [];
  let laps = 0;
  for (let i = 1; i <= stepsForward(from, to); i++) {
    const t = (from + i) % CONSTANTS.TILE_COUNT;
    path.push(t);
    if (t === CONSTANTS.START_TILE) laps++;
  }
  const salary = laps * state.lapSalary;
  const moved = credit({ ...state, players: state.players.map((p, i) => (i === seat ? { ...p, position: to } : p)) }, seat, salary);
  return { state: moved, path, salary };
}

const salaryNote = (n: number) => (n ? ` Salary +${formatRupees(n)}.` : '');

export function applyCard(state: GameState, seat: number, card: CardDef, landing: Landing): { state: GameState; note: string; path?: number[] } {
  const e = card.effect;
  const me = state.players[seat];
  const others = state.players.map((_, i) => i).filter((i) => i !== seat && !state.players[i].bankrupt);
  const owned = ownedTiles(state, seat);
  switch (e.kind) {
    case 'collect':
      return { state: credit(state, seat, e.amount), note: ` +${formatRupees(e.amount)}.` };
    case 'pay': {
      const r = pay(state, seat, null, e.amount);
      return { state: r.state, note: ` -${formatRupees(e.amount)}.${r.note}` };
    }
    case 'collectFromEach': {
      let s = state; let note = '';
      for (const o of others) { const r = pay(s, o, seat, e.amount); s = r.state; note += r.note; }
      return { state: s, note: ` +${formatRupees(e.amount)} from each other player.${note}` };
    }
    case 'payEach': {
      let s = state; let note = '';
      for (const o of others) { const r = pay(s, seat, o, e.amount); s = r.state; note += r.note; }
      return { state: s, note: ` -${formatRupees(e.amount)} to each other player.${note}` };
    }
    case 'payPerBuilding': {
      const total = owned.reduce((sum, t) => sum + state.properties[t].houses * e.house + (state.properties[t].hotel ? e.hotel : 0), 0);
      const r = pay(state, seat, null, total);
      return { state: r.state, note: ` -${formatRupees(total)} for buildings.${r.note}` };
    }
    case 'collectPerPlace': {
      const total = Math.min(owned.length * e.amount, e.max); // mortgaged places count
      return { state: credit(state, seat, total), note: ` +${formatRupees(total)}.` };
    }
    case 'jailFree': {
      const players = state.players.map((p, i) => (i === seat ? { ...p, heldCards: [...p.heldCards, card.id] } : p));
      return { state: { ...state, players }, note: ' Kept until needed.' };
    }
    case 'goToJail': {
      // To Jail with no salary; the turn ends even on a double (owner's answer).
      const players = state.players.map((p, i) => (i === seat ? { ...p, position: CONSTANTS.JAIL_TILE, inJail: true } : p));
      return { state: { ...state, players, extraTurn: false }, note: ' Straight to Jail!', path: [] };
    }
    case 'back': {
      const path: number[] = [];
      let pos = me.position;
      for (let i = 0; i < e.steps; i++) { pos = (pos - 1 + CONSTANTS.TILE_COUNT) % CONSTANTS.TILE_COUNT; path.push(pos); }
      const moved = { ...state, players: state.players.map((p, i) => (i === seat ? { ...p, position: pos } : p)) }; // no salary going back
      const l = landing(moved, seat);
      return { state: l.state, note: ` Back to ${TILES[pos].name}. ${l.note}`, path };
    }
    case 'advanceToStart': {
      const m = moveForward(state, seat, CONSTANTS.START_TILE);
      return { state: m.state, note: `${salaryNote(m.salary)}`, path: m.path };
    }
    case 'freeTrip': {
      const m = moveForward(state, seat, CONSTANTS.REST_TILE);
      return { state: m.state, note: `${salaryNote(m.salary)} Enjoy the beach.`, path: m.path };
    }
    case 'nearestUnowned': {
      let target = -1;
      for (let i = 1; i < CONSTANTS.TILE_COUNT; i++) {
        const t = (me.position + i) % CONSTANTS.TILE_COUNT;
        if (TILES[t].kind === 'property' && state.properties[t].owner === null) { target = t; break; }
      }
      if (target < 0) return { state, note: ' Every place has an owner, so nothing happens.' };
      const m = moveForward(state, seat, target);
      const l = landing(m.state, seat);
      return { state: l.state, note: `${salaryNote(m.salary)} ${l.note}`, path: m.path };
    }
  }
}
