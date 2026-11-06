import { useState } from 'react';
import GameScreen from './components/GameScreen.tsx';
import Button from './components/Button.tsx';
import { CONSTANTS } from './shared/constants.ts';
import { formatRupees } from './shared/design.ts';

const TOKENS = ['🛕', '⛵', '🥥', '🥭'];

type Screen = { name: 'home' } | { name: 'setup' } | { name: 'game'; count: number; cash: number };

// Temporary same-screen setup (stage 3). Replaced by the real host setup screen in a later stage.
export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [count, setCount] = useState<number>(CONSTANTS.MIN_SEATS);
  const [cash, setCash] = useState<number>(CONSTANTS.STARTING_CASH_OPTIONS[0]);

  if (screen.name === 'game') {
    const seats = Array.from({ length: screen.count }, (_, i) => ({ name: `Player ${i + 1}`, token: TOKENS[i] }));
    return <GameScreen seats={seats} startingCash={screen.cash} onBack={() => setScreen({ name: 'home' })} />;
  }
  if (screen.name === 'setup') {
    return (
      <main className="home">
        <h1>Local game (temporary setup)</h1>
        <p>Players on this screen:</p>
        <div className="home__row">
          {Array.from({ length: CONSTANTS.MAX_SEATS - CONSTANTS.MIN_SEATS + 1 }, (_, i) => CONSTANTS.MIN_SEATS + i).map((n) => (
            <Button key={n} primary={n === count} onClick={() => setCount(n)}>{n}</Button>
          ))}
        </div>
        <p>Starting cash:</p>
        <div className="home__row">
          {CONSTANTS.STARTING_CASH_OPTIONS.map((c) => (
            <Button key={c} primary={c === cash} onClick={() => setCash(c)}>{formatRupees(c)}</Button>
          ))}
        </div>
        <p />
        <div className="home__row">
          <Button primary icon="▶" onClick={() => setScreen({ name: 'game', count, cash })}>Start</Button>
          <Button onClick={() => setScreen({ name: 'home' })}>Back</Button>
        </div>
      </main>
    );
  }
  return (
    <main className="home">
      <h1>Five States Business Game</h1>
      <p>Coming soon: more stages are being built.</p>
      <div className="home__row">
        <Button disabledReason="Later stage">Create Game</Button>
        <Button disabledReason="Later stage">Join Game</Button>
        <Button primary icon="🎲" onClick={() => setScreen({ name: 'setup' })}>Local test game</Button>
      </div>
    </main>
  );
}
