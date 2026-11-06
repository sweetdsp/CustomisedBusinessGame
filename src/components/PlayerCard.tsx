import { formatRupees } from '../shared/design.ts';

export interface PlayerView {
  name: string;
  token: string;
  cash: number;
  places: number;
  jailCards?: number; // Get Out of Jail Free cards held
  level?: 'Easy' | 'Medium' | 'High'; // computer players only
}

export default function PlayerCard({ player, active }: { player: PlayerView; active?: boolean }) {
  return (
    <div className={`pcard ${active ? 'pcard--active' : ''}`}>
      <div className="pcard__token" aria-hidden>{player.token}</div>
      <div className="pcard__info">
        <strong>{player.name}</strong>
        {player.level && <span className="pcard__badge">🤖 {player.level}</span>}
        <div className="pcard__cash">{formatRupees(player.cash)}</div>
        <small>🏠 {player.places} places{player.jailCards ? ` · 🗝️ ×${player.jailCards}` : ''}</small>
      </div>
      {active && <span className="pcard__turn">▶ Turn</span>}
    </div>
  );
}
