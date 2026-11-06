import { useOnlineGame } from '../online/useOnlineGame.ts';
import { saveSession, type Session } from '../online/api.ts';
import { TOKENS } from './SetupScreen.tsx';
import GameScreen from './GameScreen.tsx';
import Button from './Button.tsx';

// Lobby while seats fill, then the live game. Works for the host and for people who joined with the code.
export default function OnlineRoom({ session, onLeave }: { session: Session; onLeave: () => void }) {
  const room = useOnlineGame(session);
  const leave = () => { saveSession(null); onLeave(); };
  const row = room.row;

  if (room.fatal) return <main className="home"><h1>⚠️ Session broken</h1><p>{room.fatal}</p><Button onClick={leave}>Back to start</Button></main>;
  if (!row) return <main className="home"><h1>Connecting…</h1>{room.error && <p className="error">{room.error}</p>}<Button onClick={leave}>Back</Button></main>;
  if (row.status !== 'lobby' && room.controller) return <GameScreen g={room.controller} onBack={leave} />;

  const isHost = session.role === 'host';
  const link = `${location.origin}${location.pathname}?join=${row.code}`;
  const full = row.seats.every((s) => s.taken);
  return (
    <main className="home">
      <h1>Waiting room</h1>
      <p>Share this code with friends:</p>
      <div className="lobby__code" aria-label="Room code">{row.code}</div>
      <p><button className="link" onClick={() => void navigator.clipboard?.writeText(link)}>📋 Copy invite link</button></p>
      <div className="lobby__seats">
        {row.seats.map((s, i) => (
          <div key={i} className={`lobby__seat ${s.taken ? '' : 'lobby__seat--open'}`}>
            <b>Seat {i + 1}</b>
            <div>{s.taken ? `${s.token} ${s.name}` : '⏳ Open: waiting for a player'}</div>
            <small>{s.kind === 'host' ? '🧑 Human on the host PC' : s.kind === 'computer' ? `🤖 Computer: ${s.level}` : '🌐 Human joining online'}</small>
            {(isHost || session.seat === i) && s.taken && (
              <div className="setup__tokens">
                {TOKENS.map((t) => (
                  <button key={t} className={`chip ${s.token === t ? 'chip--on' : ''}`} disabled={row.seats.some((o, j) => j !== i && o.token === t)} onClick={() => void room.token(i, t)} aria-label={`Token ${t}`}>{t}</button>
                ))}
              </div>
            )}
            {isHost && s.kind === 'online' && s.taken && <button className="link" onClick={() => void room.remove(i)}>Remove player</button>}
          </div>
        ))}
      </div>
      {room.error && <p className="error">{room.error}</p>}
      <div className="home__row">
        {isHost && <Button primary icon="▶" onClick={() => void room.start()} disabledReason={full ? undefined : 'Wait for every seat to fill'}>Start game</Button>}
        {!isHost && <p>Waiting for the host to start…</p>}
        <Button onClick={leave}>Leave</Button>
      </div>
    </main>
  );
}
