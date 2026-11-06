// Local (same screen) play. The browser stands in for the server only until online play (stage 10).
import { useEffect, useRef, useState } from 'react';
import { TIMINGS } from '../shared/design.ts';
import { newGame } from './engine.ts';
import { applyAction, type Action } from './actions.ts';
import { nextComputerMove } from './ai.ts';
import { CONSTANTS } from '../shared/constants.ts';
import type { EndMode, GameState, RollResult } from './types.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Seat = { name: string; token: string; ai?: 'Easy' | 'Medium' | 'High' };

export function useLocalGame(seats: Seat[], startingCash: number, endMode: EndMode) {
  const [state, setStateRaw] = useState<GameState>(() => newGame(seats, startingCash, Math.random, { endMode, now: Date.now() }));
  const ref = useRef(state);
  const setState = (s: GameState) => { ref.current = s; setStateRaw(s); };
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [rolling, setRolling] = useState(false);
  const [shownDice, setShownDice] = useState<[number, number] | null>(null);
  const [shownPos, setShownPos] = useState<{ seat: number; tile: number } | null>(null); // mover's tile while hopping
  const [message, setMessage] = useState(state.message);
  const [now, setNow] = useState(Date.now());

  // Clock: drives countdowns and lets the "server" end auctions and trades by time.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (busyRef.current) return;
      const s = ref.current;
      if (s.auction || s.trade || s.debt || s.endMode.kind === 'timed') {
        const next = applyAction(s, s.current, { type: 'tick' }, { rng: Math.random, now: t }).state;
        if (next !== s && (next.auction !== s.auction || next.trade !== s.trade || next.debt !== s.debt || next.gameOver !== s.gameOver || next.message !== s.message)) {
          setState(next); setMessage(next.message);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  async function animateRoll(prev: GameState, next: GameState, result: RollResult) {
    busyRef.current = true; setBusy(true);
    const seat = prev.current;
    setMessage(`${prev.players[seat].name} is rolling...`);
    setRolling(true);
    await wait(TIMINGS.diceTumble);
    setRolling(false);
    setShownDice(result.dice);
    if (result.toJail) setShownPos({ seat, tile: next.players[seat].position });
    else for (const tile of [...result.path, ...(result.cardPath ?? [])]) { setShownPos({ seat, tile }); await wait(TIMINGS.tokenHop); }
    setMessage(next.message);
    setState(next);
    setShownPos(null);
    busyRef.current = false; setBusy(false);
  }

  // Every request goes through applyAction, exactly as the server will do it.
  async function act(actor: number, action: Action): Promise<boolean> {
    if (busyRef.current) return false;
    try {
      const prev = ref.current;
      const r = applyAction(prev, actor, action, { rng: Math.random, now: Date.now() });
      if (r.result) await animateRoll(prev, r.state, r.result);
      else { setState(r.state); setMessage(r.state.message); }
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    }
  }

  // Computer players move after a short pause (1 to 2 seconds) so people can follow along.
  const failures = useRef(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (busy || state.gameOver) return;
    const move = nextComputerMove(state, Math.random);
    if (!move) return;
    const pause = (CONSTANTS.COMPUTER_PAUSE_MIN + Math.random() * (CONSTANTS.COMPUTER_PAUSE_MAX - CONSTANTS.COMPUTER_PAUSE_MIN)) * 1000;
    const id = setTimeout(async () => {
      const ok = await act(move.actor, move.action);
      if (ok) { failures.current = 0; return; }
      failures.current++;
      // Never let a computer get stuck: after repeated failures take a safe action
      if (failures.current >= 3) {
        failures.current = 0;
        const s = ref.current;
        await act(move.actor, s.debt ? { type: 'bankrupt' } : s.phase === 'awaitBuy' ? { type: 'decline' } : s.phase === 'awaitEnd' ? { type: 'endTurn' } : { type: 'roll' });
      }
      setRetry((n) => n + 1);
    }, pause);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, busy, retry]);

  const cur = () => ref.current.current;
  return {
    state, busy, rolling, shownDice, shownPos, message, now, act,
    doRoll: () => act(cur(), { type: 'roll' }),
    doEndTurn: () => act(cur(), { type: 'endTurn' }),
    doBuy: () => act(cur(), { type: 'buy' }),
    doDecline: () => act(cur(), { type: 'decline' }),
    doBuild: () => act(cur(), { type: 'build' }),
    doMortgage: (tile: number) => act(cur(), { type: 'mortgage', tile }),
    doUnmortgage: (tile: number) => act(cur(), { type: 'unmortgage', tile }),
    doSell: (tile: number) => act(cur(), { type: 'sell', tile }),
  };
}
