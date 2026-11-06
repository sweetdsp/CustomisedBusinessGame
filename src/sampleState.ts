// Fake display data for the stage 2 preview only.
import type { PlayerView } from './components/PlayerCard.tsx';

export const SAMPLE_PLAYERS: PlayerView[] = [
  { name: 'You', token: '🛕', cash: 300000, places: 0 },
  { name: 'Computer', token: '⛵', cash: 300000, places: 0, level: 'Medium' },
];
