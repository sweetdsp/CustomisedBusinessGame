import type { ReactNode } from 'react';

// The message area above the board: dice, the big banner (or auction / trade / debt panel) and card reveals.
export default function Stage({ dice, children, side }: { dice: ReactNode; children: ReactNode; side?: ReactNode }) {
  return (
    <div className="stage">
      <div className="stage__dice">{dice}</div>
      <div className="stage__main">{children}</div>
      {side && <div className="stage__side">{side}</div>}
    </div>
  );
}
