import { useState } from 'react';
import { CONSTANTS } from '../shared/constants.ts';
import { formatRupees } from '../shared/design.ts';
import type { EndMode } from '../game/types.ts';
import Button from './Button.tsx';

// Regional pieces (section 3). Computers take whichever remain.
export const TOKENS = ['🛕', '⛵', '🥥', '🥭', '🐘', '🌴'];
type Level = 'Easy' | 'Medium' | 'High';
export type SeatKind = 'human' | 'online' | Level;
export interface SeatConfig { kind: SeatKind; name: string; token: string }
export interface GameConfig { seats: SeatConfig[]; startingCash: number; endMode: EndMode }

const KIND_LABELS: [SeatKind, string][] = [['human', '🧑 Human (this screen)'], ['Easy', '🤖 Computer: Easy'], ['Medium', '🤖 Computer: Medium'], ['High', '🤖 Computer: High']];

// Host setup (section 4): starting cash, game ending, and each seat (human, online human, or computer with a level).
export default function SetupScreen({ online, onStart, onBack }: { online?: boolean; onStart: (c: GameConfig) => void; onBack: () => void }) {
  const [count, setCount] = useState<number>(CONSTANTS.MIN_SEATS);
  const [cash, setCash] = useState<number>(CONSTANTS.STARTING_CASH_OPTIONS[0]);
  const [minutes, setMinutes] = useState<number | null>(null); // null = play until one player remains
  const [kinds, setKinds] = useState<SeatKind[]>(['human', 'Medium', 'Medium', 'Medium']);
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const [tokens, setTokens] = useState<string[]>(TOKENS.slice(0, 4));
  const kindList = online ? ([...KIND_LABELS.slice(0, 1), ['online', '🌐 Human (joins online)'], ...KIND_LABELS.slice(1)] as [SeatKind, string][]) : KIND_LABELS;
  const times = Array.from({ length: 5 }, (_, i) => CONSTANTS.GAME_MINUTES_START + i * CONSTANTS.GAME_MINUTES_STEP);

  const pickToken = (i: number, t: string) => {
    const next = [...tokens];
    const j = next.indexOf(t);
    if (j >= 0 && j < count) next[j] = next[i]; // swap so that no two seats share a token
    next[i] = t;
    setTokens(next);
  };
  const humans = kinds.slice(0, count).filter((k) => k === 'human' || k === 'online').length;

  return (
    <main className="home setup">
      <h1>Set up the game</h1>
      <h3>Players</h3>
      <div className="home__row">{[2, 3, 4].map((n) => <Button key={n} primary={n === count} onClick={() => setCount(n)}>{n}</Button>)}</div>
      <h3>Starting cash</h3>
      <div className="home__row">
        {CONSTANTS.STARTING_CASH_OPTIONS.map((c) => (
          <Button key={c} primary={c === cash} onClick={() => setCash(c)}>{formatRupees(c)} (salary {formatRupees(CONSTANTS.LAP_SALARY[c])})</Button>
        ))}
      </div>
      <h3>Game ends</h3>
      <div className="home__row">
        <Button primary={minutes === null} onClick={() => setMinutes(null)}>Until one player remains</Button>
        {times.map((m) => <Button key={m} primary={minutes === m} onClick={() => setMinutes(m)}>{m} min</Button>)}
      </div>
      <h3>Seats</h3>
      <div className="setup__seats">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="setup__seat">
            <b>Seat {i + 1}</b>
            <select value={kinds[i]} onChange={(e) => setKinds(kinds.map((k, j) => (j === i ? (e.target.value as SeatKind) : k)))}>
              {kindList.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <input value={names[i]} maxLength={14} aria-label={`Seat ${i + 1} name`} onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))} />
            <div className="setup__tokens">
              {TOKENS.map((t) => (
                <button key={t} className={`chip ${tokens[i] === t ? 'chip--on' : ''}`} onClick={() => pickToken(i, t)} aria-label={`Token ${t}`}>{t}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="home__row">
        <Button primary icon="▶" onClick={() => onStart({
          startingCash: cash,
          endMode: minutes === null ? { kind: 'lastStanding' } : { kind: 'timed', minutes },
          seats: Array.from({ length: count }, (_, i) => ({ kind: kinds[i], name: names[i].trim() || `Player ${i + 1}`, token: tokens[i] })),
        })} disabledReason={humans === 0 && !online ? 'Add at least one human' : undefined}>Start</Button>
        <Button onClick={onBack}>Back</Button>
      </div>
    </main>
  );
}
