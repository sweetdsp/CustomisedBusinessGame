import type { GameState } from '../game/types.ts';
import { NetWorthTable } from './NetWorthModal.tsx';

// Final results: the winner(s) and every player's net worth breakdown.
export default function ResultsScreen({ state, onHome }: { state: GameState; onHome: () => void }) {
  const over = state.gameOver!;
  const winners = over.winners.map((i) => state.players[i]);
  return (
    <main className="results">
      <div className="results__fireworks" aria-hidden>🎆 🎇 🎆</div>
      <h1>🏆 {winners.length > 1 ? 'Shared win!' : `${winners[0].name} wins!`}</h1>
      <p>{over.reason === 'time' ? 'Time ran out: highest net worth wins.' : 'Last player standing.'}</p>
      <div className="podium">
        {winners.map((w) => <div key={w.name} className="podium__step"><span>{w.token}</span><b>{w.name}</b></div>)}
      </div>
      <NetWorthTable state={state} />
      <p><button className="btn btn--glow" onClick={onHome}>🏠 Back to start</button></p>
    </main>
  );
}
