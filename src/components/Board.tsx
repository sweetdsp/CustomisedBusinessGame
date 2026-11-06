import { TILES, gridCell } from '../shared/board.ts';
import Tile, { type OwnerView } from './Tile.tsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { sound } from '../shared/sound.ts';

export interface TokenView { seat: number; token: string; position: number }

export default function Board({ children, tokens = [], owners = {} }: { children?: ReactNode; tokens?: TokenView[]; owners?: Record<number, OwnerView> }) {
  // tiny hop sound whenever any token lands on a new tile
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
                {here.map((k) => <span key={k.seat} className="token">{k.token}</span>)}
              </div>
            )}
          </div>
        );
      })}
      <div className="board__center">{children}</div>
    </div>
  );
}
