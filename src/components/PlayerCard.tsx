import { formatRupees } from '../shared/design.ts';
import { STATES } from '../shared/constants.ts';

export interface PlayerView {
  name: string;
  token: string;
  cash: number;
  places: number;
  sets?: { state: string; count: number }[]; // places owned in each colour group
  jailCards?: number; // Get Out of Jail Free cards held
  level?: 'Easy' | 'Medium' | 'High'; // computer players only
}

export default function PlayerCard({ player, active, seat }: { player: PlayerView; active?: boolean; seat?: number }) {
  return (
    <div className={`pcard ${active ? 'pcard--active' : ''}`} data-seat={seat}>
      <div className="pcard__token" aria-hidden>{player.token}</div>
      <div className="pcard__info">
        <strong>{player.name}</strong>
        {player.level && <span className="pcard__badge">🤖 {player.level}</span>}
        <div className="pcard__cash">{formatRupees(player.cash)}</div>
        {player.sets && (
          <div className="pcard__sets" aria-label="Places owned per colour">
            {player.sets.map((x) => (
              <span key={x.state} className={`setpill state-${x.state}`} title={`${STATES[x.state as keyof typeof STATES].name}: ${x.count} of 6`}>{x.state} {x.count}/6</span>
            ))}
          </div>
        )}
        <small>🏠 {player.places} {player.places === 1 ? 'place' : 'places'}{player.jailCards ? ` · 🗝️ ×${player.jailCards}` : ''}</small>
      </div>
      {active && <span className="pcard__turn">▶ Turn</span>}
    </div>
  );
}
