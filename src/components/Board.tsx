import { useEffect, useRef, type ReactNode } from 'react';
import { TILES, gridCell } from '../shared/board.ts';
import { sound } from '../shared/sound.ts';
import Tile, { type OwnerView } from './Tile.tsx';

export interface TokenView { seat: number; token: string; position: number; color: string; active: boolean }

// The 42-tile ring (section 5 / 23), with the message centre in the middle.
export default function Board({ children, tokens = [], owners = {} }: { children?: ReactNode; tokens?: TokenView[]; owners?: Record<number, OwnerView> }) {
  // a small tick whenever any piece lands on a new tile
  const last = useRef('');
  useEffect(() => { const k = tokens.map((t) => t.position).join(','); if (last.current && k !== last.current) sound.hop(); last.current = k; });
  return (
    <div className="board">
      {TILES.map((t) => {
        const { row, col } = gridCell(t.index);
        const here = tokens.filter((k) => k.position === t.index);
        return (
          <div key={t.index} style={{ gridRow: row, gridColumn: col }} className="board__cell">
            <Tile tile={t} owner={owners[t.index]} />
            {here.length > 0 && (
              <div className="tokens">
                {here.map((k, n) => (
                  <span key={k.seat} className={`token ${k.active ? 'token--active' : ''}`} style={{ backgroundColor: k.color, zIndex: 10 + n }} title={`Player ${k.seat + 1}`}>
                    <span className="token__glyph">{k.token}</span>
                    <span className="token__num">{k.seat + 1}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="board__center">{children}</div>
    </div>
  );
}
