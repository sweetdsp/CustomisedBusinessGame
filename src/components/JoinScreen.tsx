import { useState } from 'react';
import { call, saveSession, type Session } from '../online/api.ts';
import { TOKENS } from './SetupScreen.tsx';
import Button from './Button.tsx';

// Join with a six character room code, pick a name and a token.
export default function JoinScreen({ initialCode, onJoined, onBack }: { initialCode?: string; onJoined: (s: Session) => void; onBack: () => void }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [name, setName] = useState('');
  const [token, setToken] = useState(TOKENS[1]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setError(null);
    const r = await call({ op: 'join', code, name, token });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    const session: Session = { gameId: r.row.id, secret: r.secret!, role: 'player', seat: r.seat };
    saveSession(session); onJoined(session);
  };
  return (
    <main className="home setup">
      <h1>Join a game</h1>
      <label>Room code<br /><input className="lobby__input" value={code} maxLength={6} placeholder="ABC123" onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
      <p><label>Your name<br /><input className="lobby__input" value={name} maxLength={14} placeholder="Your name" onChange={(e) => setName(e.target.value)} /></label></p>
      <div className="setup__tokens" style={{ justifyContent: 'center' }}>
        {TOKENS.map((t) => <button key={t} className={`chip ${t === token ? 'chip--on' : ''}`} onClick={() => setToken(t)} aria-label={`Token ${t}`}>{t}</button>)}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="home__row">
        <Button primary icon="🚪" onClick={go} disabledReason={busy ? 'Joining…' : code.length !== 6 ? 'Enter the 6 character code' : !name.trim() ? 'Enter your name' : undefined}>Join</Button>
        <Button onClick={onBack}>Back</Button>
      </div>
    </main>
  );
}
