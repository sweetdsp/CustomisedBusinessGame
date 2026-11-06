import { TILES, gridCell } from '../shared/board.ts';
import Tile from './Tile.tsx';
import type { ReactNode } from 'react';

export default function Board({ children }: { children?: ReactNode }) {
  return (
    <div className="board">
      {TILES.map((t) => {
        const { row, col } = gridCell(t.index);
        return (
          <div key={t.index} style={{ gridRow: row, gridColumn: col }} className="board__cell">
            <Tile tile={t} />
          </div>
        );
      })}
      <div className="board__center">{children}</div>
    </div>
  );
}
