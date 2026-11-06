import { useLocalGame } from '../game/useLocalGame.ts';
import type { EndMode } from '../game/types.ts';
import GameScreen from './GameScreen.tsx';

export default function LocalGame({ seats, startingCash, endMode, onBack }: {
  seats: { name: string; token: string; ai?: 'Easy' | 'Medium' | 'High' }[]; startingCash: number; endMode: EndMode; onBack: () => void;
}) {
  const g = useLocalGame(seats, startingCash, endMode);
  return <GameScreen g={g} onBack={onBack} />;
}
