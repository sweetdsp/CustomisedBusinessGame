import Board from './Board.tsx';
import CenterPanel from './CenterPanel.tsx';
import Banner from './Banner.tsx';
import PlayerCard from './PlayerCard.tsx';
import Button from './Button.tsx';
import ChatBox from './ChatBox.tsx';
import TimerRing from './TimerRing.tsx';
import { SAMPLE_PLAYERS } from '../sampleState.ts';
import { CONSTANTS } from '../shared/constants.ts';

export default function GameScreen({ onBack }: { onBack: () => void }) {
  const [p1, p2] = SAMPLE_PLAYERS;
  return (
    <div className="game">
      <aside className="game__players">
        <PlayerCard player={p1} active />
        <PlayerCard player={p2} />
        <Button icon="📊" disabledReason="Opens in a later stage">Net worth</Button>
      </aside>
      <div className="game__board">
        <Board>
          <CenterPanel>
            <Banner>Your turn!</Banner>
            <div className="dice-slot" aria-hidden>🎲 🎲</div>
          </CenterPanel>
        </Board>
      </div>
      <aside className="game__side">
        <TimerRing seconds={CONSTANTS.TURN_ROLL_SECONDS} total={CONSTANTS.TURN_ROLL_SECONDS} />
        <Button primary icon="🎲">Roll Dice</Button>
        <Button icon="🔨" disabledReason="Land on your own place first">Build</Button>
        <Button icon="⏭️" disabledReason="Roll first">End Turn</Button>
        <ChatBox />
        <button className="link" onClick={onBack}>← Back</button>
      </aside>
    </div>
  );
}
