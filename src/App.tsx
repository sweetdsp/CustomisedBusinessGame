import { useState } from 'react';
import GameScreen from './components/GameScreen.tsx';
import Button from './components/Button.tsx';
import SetupScreen, { type GameConfig } from './components/SetupScreen.tsx';

type Screen = { name: 'home' } | { name: 'setup' } | { name: 'game'; config: GameConfig };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  if (screen.name === 'game') {
    const c = screen.config;
    const seats = c.seats.map((s) => ({ name: s.name, token: s.token, ai: s.kind === 'human' || s.kind === 'online' ? undefined : s.kind }));
    return <GameScreen seats={seats} startingCash={c.startingCash} endMode={c.endMode} onBack={() => setScreen({ name: 'home' })} />;
  }
  if (screen.name === 'setup') {
    return <SetupScreen onStart={(config) => setScreen({ name: 'game', config })} onBack={() => setScreen({ name: 'home' })} />;
  }
  return (
    <main className="home">
      <h1>Five States Business Game</h1>
      <p>Towns of Tamil Nadu, Kerala, Karnataka, Andhra Pradesh and Telangana.</p>
      <div className="home__row">
        <Button primary icon="🎲" onClick={() => setScreen({ name: 'setup' })}>Play on this screen</Button>
      </div>
    </main>
  );
}
