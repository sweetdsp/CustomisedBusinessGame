// Countdown ring. `big` is for auctions and trades, readable from across a room.
export default function TimerRing({ seconds, total, big }: { seconds: number; total: number; big?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round((seconds / total) * 100)));
  return (
    <div className={`timer ${big ? 'timer--big' : ''}`} style={{ ['--pct' as string]: `${pct}%` }} role="timer" aria-label={`${seconds} seconds left`}>
      <span>{seconds}</span>
    </div>
  );
}
