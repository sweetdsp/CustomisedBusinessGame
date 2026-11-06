// Placeholder ring; real countdown arrives with the timers (stages 3 and 7).
export default function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.round((seconds / total) * 100);
  return (
    <div className="timer" style={{ ['--pct' as string]: `${pct}%` }} role="timer" aria-label={`${seconds} seconds left`}>
      <span>{seconds}</span>
    </div>
  );
}
