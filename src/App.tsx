import { useState } from 'react';
import GameScreen from './components/GameScreen.tsx';
import Button from './components/Button.tsx';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'preview'>('home');
  if (screen === 'preview') return <GameScreen onBack={() => setScreen('home')} />;
  return (
    <main className="home">
      <h1>Five States Business Game</h1>
      <p>Coming soon: more stages are being built.</p>
      <div className="home__row">
        <Button disabledReason="Later stage">Create Game</Button>
        <Button disabledReason="Later stage">Join Game</Button>
        <Button primary icon="👀" onClick={() => setScreen('preview')}>Preview board</Button>
      </div>
    </main>
  );
}
