// Local (same screen) play. The browser stands in for the server only until online play (stage 10).
import { useRef, useState } from 'react';
import { TIMINGS } from '../shared/design.ts';
import { newGame, roll, endTurn, buy, decline } from './engine.ts';
import { build, mortgage, unmortgage, sellBuilding } from './build.ts';
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
    if (result.toJail) {
      setShownPos(next.players[state.current].position);
    } else {
      for (const tile of result.path) { setShownPos(tile); await wait(TIMINGS.tokenHop); }
    }
    setMessage(next.message);
    setState(next);
    setShownPos(null);
    busyRef.current = false; setBusy(false);
  }

  function doEndTurn() {
    if (busyRef.current || state.phase !== 'awaitEnd') return;
    const next = endTurn(state);
    setState(next); setMessage(next.message);
  }

  function doBuy() {
    if (busyRef.current || state.phase !== 'awaitBuy') return;
    const next = buy(state);
    setState(next); setMessage(next.message);
  }

  function doDecline() {
    if (busyRef.current || state.phase !== 'awaitBuy') return;
    const next = decline(state);
    setState(next); setMessage(next.message);
  }

  // Build, mortgage, unmortgage and sell are allowed any time on your own turn, except while dice or token are moving.
  function act(fn: (s: GameState) => GameState) {
    if (busyRef.current) return;
    const next = fn(state);
    setState(next); setMessage(next.message);
  }
  const doBuild = () => act(build);
  const doMortgage = (tile: number) => act((s) => mortgage(s, tile));
  const doUnmortgage = (tile: number) => act((s) => unmortgage(s, tile));
  const doSell = (tile: number) => act((s) => sellBuilding(s, tile));

  return { state, busy, rolling, shownDice, shownPos, message, doRoll, doEndTurn, doBuy, doDecline, doBuild, doMortgage, doUnmortgage, doSell };
}
