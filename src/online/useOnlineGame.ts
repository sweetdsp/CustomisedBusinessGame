// Online play: the server holds the game; this hook mirrors it, sends actions, pings, and animates other people's moves.
import { useEffect, useRef, useState } from 'react';
import { TIMINGS } from '../shared/design.ts';
import { call, subscribe, type Session } from './api.ts';
import { helpers, type GameController } from '../game/controller.ts';
import type { Action } from '../game/actions.ts';
import type { GameRow, Request, Response } from '../server/types.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useOnlineGame(session: Session) {
  const [row, setRowState] = useState<GameRow | null>(null);
  const rowRef = useRef<GameRow | null>(null);
  const offset = useRef(0); // server clock minus this browser's clock
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [shownDice, setShownDice] = useState<[number, number] | null>(null);
  const [shownPos, setShownPos] = useState<{ seat: number; tile: number } | null>(null);
  const [message, setMessage] = useState('');
  const animating = useRef(false);
  const lastRollKey = useRef('');

  const apply = (next: GameRow, serverNow?: number) => {
    if (serverNow) offset.current = serverNow - Date.now();
    const cur = rowRef.current;
    if (cur && next.version < cur.version) return; // an older copy arrived late
    rowRef.current = next;
    setRowState(next);
  };

  // send a request, keep the newest record
  const send = async (req: Request): Promise<Response> => {
    const res = await call(req);
    if (res.ok) { apply(res.row, res.serverNow); setError(null); }
    else {
      if (/broken|cannot be reconnected/i.test(res.error)) setFatal(res.error);
      setError(res.error);
    }
    return res;
  };

  useEffect(() => {
    void send({ op: 'get', gameId: session.gameId });
    const unsub = subscribe(session.gameId, (r) => apply(r));
    const clock = setInterval(() => setNow(Date.now() + offset.current), 250);
    const poll = setInterval(() => void send({ op: 'get', gameId: session.gameId }), 4000); // in case a live update is missed
    const ping = setInterval(() => void send({ op: 'ping', gameId: session.gameId, secret: session.secret }), 5000);
    void send({ op: 'ping', gameId: session.gameId, secret: session.secret });
    let ticking = false;
    const tickLoop = setInterval(async () => {
      const r = rowRef.current;
      if (!r || r.status !== 'playing' || ticking) return;
      if (Date.now() + offset.current < r.dueAt) return;
      ticking = true;
      await wait(Math.random() * 400); // spread out so every browser does not call at once
      await send({ op: 'tick', gameId: session.gameId });
      ticking = false;
    }, 600);
    return () => { unsub(); clearInterval(clock); clearInterval(poll); clearInterval(ping); clearInterval(tickLoop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.gameId, session.secret]);

  // Animate a new roll (dice tumble, token hops) for everybody who is watching.
  const state = row?.state ?? null;
  const prevPos = useRef<number[] | null>(null);
  useEffect(() => {
    if (!state) return;
    setMessage(state.message);
    const key = state.lastRoll ? JSON.stringify([state.lastRoll.dice, state.lastRoll.path, state.lastRoll.cardPath, state.doublesCount, state.current]) : '';
    const before = prevPos.current;
    prevPos.current = state.players.map((p) => p.position);
    if (!state.lastRoll || key === lastRollKey.current || !before || animating.current) { if (!lastRollKey.current && key) lastRollKey.current = key; return; }
    lastRollKey.current = key;
    const lr = state.lastRoll;
    const mover = state.players.findIndex((p, i) => p.position !== before[i]);
    animating.current = true; setBusy(true); setRolling(true);
    void (async () => {
      await wait(TIMINGS.diceTumble);
      setRolling(false); setShownDice(lr.dice);
      if (mover >= 0) for (const tile of [...lr.path, ...(lr.cardPath ?? [])]) { setShownPos({ seat: mover, tile }); await wait(TIMINGS.tokenHop); }
      setShownPos(null); animating.current = false; setBusy(false);
    })();
  }, [state]);

  const mySeats = row
    ? row.seats.map((s, i) => ({ s, i })).filter(({ s, i }) => (session.role === 'host' ? s.kind === 'host' : i === session.seat)).map(({ i }) => i)
    : [];

  const act = async (actor: number, action: Action): Promise<boolean> => {
    const res = await send({ op: 'act', gameId: session.gameId, secret: session.secret, seat: actor, action });
    if (!res.ok) setMessage(res.error);
    return res.ok;
  };

  const controller: GameController | null = state ? {
    state, busy, rolling, shownDice, shownPos, message, now, act, mySeats, fatal,
    chat: {
      messages: row!.chat,
      send: (text) => void send({ op: 'chat', gameId: session.gameId, secret: session.secret, seat: mySeats[0] ?? 0, text }),
    },
    ...helpers(act, () => rowRef.current?.state?.current ?? 0),
  } : null;

  return {
    row, error, fatal, now, mySeats, controller,
    token: (seat: number, token: string) => send({ op: 'token', gameId: session.gameId, secret: session.secret, seat, token }),
    remove: (seat: number) => send({ op: 'remove', gameId: session.gameId, secret: session.secret, seat }),
    start: () => send({ op: 'start', gameId: session.gameId, secret: session.secret }),
    chat: (text: string) => send({ op: 'chat', gameId: session.gameId, secret: session.secret, seat: mySeats[0] ?? 0, text }),
  };
}
