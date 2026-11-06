import type { ReactNode } from 'react';

// Festive centre of the board; holds the banner and, later, the dice and card reveals.
export default function CenterPanel({ children }: { children?: ReactNode }) {
  return (
    <div className="center">
      <div className="center__lamps" aria-hidden>
        {['🪔', '🌼', '🪔', '🌸', '🪔'].map((e, i) => <span key={i} style={{ animationDelay: `${i * 0.6}s` }}>{e}</span>)}
      </div>
      <h2 className="center__title">Five States</h2>
      <div className="center__stage">{children}</div>
    </div>
  );
}
