import Board from './Board.tsx';
import CenterPanel from './CenterPanel.tsx';
import Banner from './Banner.tsx';
import PlayerCard from './PlayerCard.tsx';
import Button from './Button.tsx';
import ChatBox from './ChatBox.tsx';
import TimerRing from './TimerRing.tsx';
import Dice from './Dice.tsx';
import { useLocalGame } from '../game/useLocalGame.ts';
import { CONSTANTS } from '../shared/constants.ts';

export default function GameScreen({ seats, startingCash, onBack }: {
  seats: { name: string; token: string }[]; startingCash: number; onBack: () => void;
}) {
  const g = useLocalGame(seats, startingCash);
  const { state } = g;
  const tokens = state.players
    .map((p, seat) => ({ seat, token: p.token, position: seat === state.current && g.shownPos !== null ? g.shownPos : p.position, bankrupt: p.bankrupt }))
    .filter((t) => !t.bankrupt);
  const canRoll = state.phase === 'awaitRoll' && !g.busy;
  return (
    <div className="game">
      <aside className="game__players">
        {state.players.map((p, i) => (
          <PlayerCard key={i} player={{ name: p.name, token: p.token, cash: p.cash, places: 0 }} active={i === state.current} />
        ))}
      </aside>
      <div className="game__board">
        <Board tokens={tokens}>
          <CenterPanel>
            <Banner>{g.message}</Banner>
            <Dice values={g.shownDice} rolling={g.rolling} />
          </CenterPanel>
        </Board>
      </div>
      <aside className="game__side">
        <TimerRing seconds={CONSTANTS.TURN_ROLL_SECONDS} total={CONSTANTS.TURN_ROLL_SECONDS} />
        <Button primary={canRoll} icon="🎲" onClick={g.doRoll}
          disabledReason={canRoll ? undefined : g.busy ? 'Moving...' : 'Already rolled'}>Roll Dice</Button>
        <Button primary={state.phase === 'awaitEnd' && !g.busy} icon="⏭️" onClick={g.doEndTurn}
          disabledReason={state.phase === 'awaitEnd' && !g.busy ? undefined : 'Roll first'}>End Turn</Button>
        <ChatBox />
        <button className="link" onClick={onBack}>← Back</button>
      </aside>
    </div>
  );
}
