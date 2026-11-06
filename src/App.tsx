import { useState } from 'react';
import Button from './components/Button.tsx';
import SetupScreen, { type GameConfig } from './components/SetupScreen.tsx';
import LocalGame from './components/LocalGame.tsx';
import OnlineRoom from './components/OnlineRoom.tsx';
import Credits from './components/Credits.tsx';
import JoinScreen from './components/JoinScreen.tsx';
import { call, loadSession, saveSession, onlineConfigured, type Session } from './online/api.ts';

type Screen =
  | { name: 'home' } | { name: 'setup' } | { name: 'setupOnline' } | { name: 'join' }
  | { name: 'local'; config: GameConfig }
  | { name: 'room'; session: Session };

const joinParam = new URLSearchParams(location.search).get('join')?.toUpperCase() ?? undefined;

export default function App() {
  const saved = loadSession();
  const [screen, setScreen] = useState<Screen>(joinParam ? { name: 'join' } : { name: 'home' });
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(false);
  const home = () => setScreen({ name: 'home' });

  if (screen.name === 'local') {
    const c = screen.config;
    const seats = c.seats.map((s) => ({ name: s.name, token: s.token, ai: s.kind === 'human' || s.kind === 'online' ? undefined : s.kind }));
    return <LocalGame seats={seats} startingCash={c.startingCash} endMode={c.endMode} onBack={home} />;
  }
  if (screen.name === 'setup') return <SetupScreen onStart={(config) => setScreen({ name: 'local', config })} onBack={home} />;
  if (screen.name === 'setupOnline') {
    return (
      <>
        <SetupScreen online onBack={home} onStart={async (c) => {
          const r = await call({
            op: 'create', startingCash: c.startingCash, endMode: c.endMode,
            seats: c.seats.map((s) => ({ kind: s.kind === 'human' ? 'host' : s.kind === 'online' ? 'online' : 'computer', level: s.kind === 'human' || s.kind === 'online' ? undefined : s.kind, name: s.name, token: s.token })),
          });
          if (!r.ok) return setError(r.error);
          const session: Session = { gameId: r.row.id, secret: r.secret!, role: 'host' };
          saveSession(session); setScreen({ name: 'room', session });
        }} />
        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
      </>
    );
  }
  if (screen.name === 'join') return <JoinScreen initialCode={joinParam} onJoined={(session) => setScreen({ name: 'room', session })} onBack={home} />;
  if (screen.name === 'room') return <OnlineRoom session={screen.session} onLeave={home} />;

  return (
    <main className="home">
      <h1>Business Game</h1>
      <div className="home__row">
        <Button primary icon="🎲" onClick={() => setScreen({ name: 'setup' })}>Play on this screen</Button>
        <Button icon="🌐" onClick={() => setScreen({ name: 'setupOnline' })} disabledReason={onlineConfigured ? undefined : 'Online play needs setup (SETUP.md)'}>Create Game</Button>
        <Button icon="🚪" onClick={() => setScreen({ name: 'join' })} disabledReason={onlineConfigured ? undefined : 'Online play needs setup (SETUP.md)'}>Join Game</Button>
        {saved && onlineConfigured && <Button icon="↩️" onClick={() => setScreen({ name: 'room', session: saved })}>Rejoin my game</Button>}
      </div>
      <p><button className="link" onClick={() => setCredits(true)}>📷 Photo credits</button></p>
      {credits && <Credits onClose={() => setCredits(false)} />}
    </main>
  );
}
