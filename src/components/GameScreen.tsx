import { useState } from 'react';
import Board from './Board.tsx';
import CenterPanel from './CenterPanel.tsx';
import Banner from './Banner.tsx';
import PlayerCard from './PlayerCard.tsx';
import Button from './Button.tsx';
import ChatBox from './ChatBox.tsx';
import TimerRing from './TimerRing.tsx';
import Dice from './Dice.tsx';
import CardReveal from './CardReveal.tsx';
import PlacesList from './PlacesList.tsx';
import AuctionPanel from './AuctionPanel.tsx';
import TradePanel from './TradePanel.tsx';
import TradeModal from './TradeModal.tsx';
import DebtPanel from './DebtPanel.tsx';
import NetWorthModal from './NetWorthModal.tsx';
import ResultsScreen from './ResultsScreen.tsx';
import Effects from './Effects.tsx';
import MuteButton from './MuteButton.tsx';
import type { GameController } from '../game/controller.ts';
import { CONSTANTS } from '../shared/constants.ts';
import { TILES, propertyOf } from '../shared/board.ts';
import { SEAT_COLORS, formatRupees } from '../shared/design.ts';
import { ownedTiles } from '../game/rent.ts';
import { checkBuild } from '../game/build.ts';
import { gameDeadline } from '../game/endgame.ts';

export default function GameScreen({ g, onBack }: { g: GameController; onBack: () => void }) {
  const { state } = g;
  // Which seats may this screen play for? Local play: every human seat. Online: only your own.
  const mine = (seat: number) => (g.mySeats === null ? !state.players[seat].ai : g.mySeats.includes(seat));
  const [tradeOpen, setTradeOpen] = useState(false);
  const [worthOpen, setWorthOpen] = useState(false);
  const [confirmSeat, setConfirmSeat] = useState<number | null>(null);
  if (g.fatal) return <main className="home"><h1>⚠️ Session broken</h1><p>{g.fatal}</p><button className="btn" onClick={onBack}>Back to start</button></main>;
  if (state.gameOver) return <ResultsScreen state={state} onHome={onBack} />;
  const cur = state.players[state.current];
  const deadline = gameDeadline(state);
  const now = g.now;
  const tokens = state.players
    .map((p, seat) => ({ seat, token: p.token, position: g.shownPos && g.shownPos.seat === seat ? g.shownPos.tile : p.position, bankrupt: p.bankrupt }))
    .filter((t) => !t.bankrupt);
  const owners = Object.fromEntries(
    Object.entries(state.properties)
      .filter(([, p]) => p.owner !== null)
      .map(([i, p]) => [i, { token: state.players[p.owner!].token, color: SEAT_COLORS[p.owner!], mortgaged: p.mortgaged, houses: p.houses, hotel: p.hotel }]),
  );
  const price = propertyOf(TILES[cur.position])?.price ?? 0;
  const aiTurn = !mine(state.current);
  const overlay = !!(state.auction || state.trade || state.debt) || aiTurn;
  const buying = state.phase === 'awaitBuy' && !g.busy && !overlay;
  const buildCheck = checkBuild(state);
  const canBuild = buildCheck.ok && !g.busy && !overlay;
  const canRoll = state.phase === 'awaitRoll' && !g.busy && !overlay;
  const canEnd = state.phase === 'awaitEnd' && !g.busy && !overlay;
  const canTrade = (state.phase === 'awaitRoll' || state.phase === 'awaitEnd') && !g.busy && !overlay && state.tradesThisTurn < CONSTANTS.TRADES_PER_TURN;
  const tradeWhy = canTrade ? undefined : aiTurn ? `${cur.name} is playing` : overlay ? 'Wait for the auction or trade' : state.tradesThisTurn >= CONSTANTS.TRADES_PER_TURN ? 'Three trades already this turn' : g.busy ? 'Moving...' : 'Finish buying first';
  const rollWhy = canRoll ? undefined : aiTurn ? `${cur.name} is playing` : overlay ? 'Auction or trade open' : g.busy ? 'Moving...' : 'Already rolled';

  return (
    <>
    {deadline !== null && (
      <div className="clock">⏱ {now >= deadline ? 'Time is up: the game ends when this turn finishes' : `${Math.floor((deadline - now) / 60000)}:${String(Math.floor(((deadline - now) % 60000) / 1000)).padStart(2, '0')} left`}</div>
    )}
    <div className="game">
      <aside className="game__players">
        {state.players.map((p, i) => (
          <PlayerCard key={i} seat={i} player={{ name: p.name, token: p.token, cash: p.cash, places: ownedTiles(state, i).length, jailCards: p.heldCards.length, level: p.ai }} active={i === state.current} />
        ))}
        <PlacesList state={state} disabled={g.busy || !!(state.auction || state.trade) || aiTurn} onMortgage={g.doMortgage} onUnmortgage={g.doUnmortgage} onSell={g.doSell} />
      </aside>
      <div className="game__board">
        <Board tokens={tokens} owners={owners}>
          <CenterPanel>
            {state.debt ? <DebtPanel state={state} now={g.now} canAct={mine(state.debt.seat)} onBankrupt={(seat) => g.act(seat, { type: 'bankrupt' })} />
              : state.auction ? <AuctionPanel state={state} now={g.now} canBid={mine} onBid={(seat, step) => g.act(seat, { type: 'bid', step })} />
              : state.trade ? <TradePanel state={state} now={g.now} canAnswer={mine(state.trade.to)} onAnswer={(accept) => g.act(state.trade!.to, { type: 'answerTrade', accept })} />
              : (<>
                <Banner>{g.message}</Banner>
                {state.lastCard && !g.busy ? <CardReveal deck={state.lastCard.deck} id={state.lastCard.id} /> : <Dice values={g.shownDice} rolling={g.rolling} />}
              </>)}
          </CenterPanel>
        </Board>
      </div>
      <aside className="game__side">
        <TimerRing seconds={CONSTANTS.TURN_ROLL_SECONDS} total={CONSTANTS.TURN_ROLL_SECONDS} />
        <Button primary={canRoll} icon="🎲" onClick={g.doRoll} disabledReason={rollWhy}>Roll Dice</Button>
        <Button primary={canBuild} icon="🔨" onClick={g.doBuild} disabledReason={g.busy ? 'Moving...' : aiTurn ? `${cur.name} is playing` : overlay ? 'Auction or trade open' : buildCheck.ok ? undefined : buildCheck.reason}>
          {buildCheck.ok ? `Build ${buildCheck.label} ${formatRupees(buildCheck.cost)}` : 'Build'}
        </Button>
        <Button primary={buying} icon="🛒" onClick={g.doBuy} disabledReason={buying ? undefined : 'Land on a place for sale'}>Buy {buying ? formatRupees(price) : ''}</Button>
        <Button icon="✋" onClick={g.doDecline} disabledReason={buying ? undefined : 'Land on a place for sale'}>No thanks (auction)</Button>
        <Button icon="🤝" onClick={() => setTradeOpen(true)} disabledReason={tradeWhy}>Trade</Button>
        {cur.inJail && (
          <>
            <Button icon="🔓" onClick={() => g.act(state.current, { type: 'payFine' })}
              disabledReason={state.phase === 'awaitRoll' && !overlay && !g.busy ? (cur.cash >= CONSTANTS.JAIL_FINE ? undefined : 'Not enough cash') : 'Only before rolling'}>
              Pay fine {formatRupees(CONSTANTS.JAIL_FINE)}
            </Button>
            <Button icon="🗝️" onClick={() => g.act(state.current, { type: 'useJailCard' })}
              disabledReason={state.phase === 'awaitRoll' && !overlay && !g.busy ? (cur.heldCards.length ? undefined : 'No Get Out of Jail Free card') : 'Only before rolling'}>
              Use Get Out of Jail Free
            </Button>
            <small>In Jail: pay, use a card, or roll a double (turn {cur.jailTurns + 1} of {CONSTANTS.JAIL_MAX_TURNS}).</small>
          </>
        )}
        <Button icon="📊" onClick={() => setWorthOpen(true)}>Net worth</Button>
        <Button primary={canEnd} icon="⏭️" onClick={g.doEndTurn} disabledReason={canEnd ? undefined : 'Roll first'}>End Turn</Button>
        <ChatBox chat={g.chat} />
        {confirmSeat !== null ? (
          <div className="confirm">
            <p><b>{state.players[confirmSeat].name}</b>: leave the game? This is final.</p>
            <button className="btn" onClick={() => { g.act(confirmSeat, { type: 'bankrupt' }); setConfirmSeat(null); }}>Yes, I'm bankrupt</button>
            <button className="btn" onClick={() => setConfirmSeat(null)}>No, keep playing</button>
          </div>
        ) : state.players.map((p, i) => (p.bankrupt || !mine(i) ? null : (
          <button key={i} className="link" onClick={() => setConfirmSeat(i)}>🏳️ {p.name}: I'm bankrupt and exiting</button>
        )))}
        <button className="link" onClick={onBack}>← Back</button>
      </aside>
      <Effects state={state} />
      <MuteButton />
      {worthOpen && <NetWorthModal state={state} onClose={() => setWorthOpen(false)} />}
      {tradeOpen && (
        <TradeModal state={state} onClose={() => setTradeOpen(false)}
          onSend={(to, give, get) => { setTradeOpen(false); g.act(state.current, { type: 'proposeTrade', to, give, get }); }} />
      )}
    </div>
    </>
  );
}
