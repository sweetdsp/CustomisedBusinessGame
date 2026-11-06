// Local (same screen) play. The browser stands in for the server only until online play (stage 10).
import { useRef, useState } from 'react';
import { TIMINGS } from '../shared/design.ts';
import { TILES } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';
import { newGame, roll, endTurn } from './engine.ts';
import type { GameState } from './types.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useLocalGame(seats: { name: string; token: string }[], startingCash: number) {
  const [state, setState] = useState<GameState>(() => newGame(seats, startingCash, Math.random));
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [shownDice, setShownDice] = useState<[number, number] | null>(null);
  const [shownPos, setShownPos] = useState<number | null>(null); // mover's tile while hopping
  const [message, setMessage] = useState(state.message);
  const busyRef = useRef(false);

  async function doRoll() {
    if (busyRef.current || state.phase !== 'awaitRoll') return;
    busyRef.current = true; setBusy(true);
    const { state: next, result } = roll(state, Math.random);
    const mover = state.players[state.current];
    setMessage(`${mover.name} is rolling...`);
    setRolling(true);
    await wait(TIMINGS.diceTumble);
    setRolling(false);
    setShownDice(result.dice);
    setMessage(next.message);
    if (result.toJail) {
      setShownPos(next.players[state.current].position);
      setMessage(`${mover.name} rolled three doubles: straight to Jail!`);
    } else {
      for (const tile of result.path) { setShownPos(tile); await wait(TIMINGS.tokenHop); }
      const extra = result.salaryPaid ? ` Salary +${formatRupees(result.salaryPaid)}!` : '';
      setMessage(`${next.message}. Landed on ${TILES[result.path[result.path.length - 1]].name}.${extra}${result.isDouble ? ' Doubles!' : ''}`);
    }
    setState(next);
    setShownPos(null);
    busyRef.current = false; setBusy(false);
  }

  function doEndTurn() {
    if (busyRef.current || state.phase !== 'awaitEnd') return;
    const next = endTurn(state);
    setState(next); setMessage(next.message);
  }

  return { state, busy, rolling, shownDice, shownPos, message, doRoll, doEndTurn };
}
