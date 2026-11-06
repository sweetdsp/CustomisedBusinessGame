import type { ReactNode } from 'react';

// Plain centre of the board: holds the banner, dice, card reveals and the auction, trade and debt panels.
export default function CenterPanel({ children }: { children?: ReactNode }) {
  return (
    <div className="center">
      <h2 className="center__title">Business Game</h2>
      <div className="center__stage">{children}</div>
    </div>
  );
}
