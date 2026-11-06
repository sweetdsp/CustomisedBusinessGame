import { TILES, gridCell } from '../shared/board.ts';
import Tile, { type OwnerView } from './Tile.tsx';

export interface TokenView { seat: number; token: string; position: number; color: string }

// The whole board is the path: 42 large tiles in a 7 by 6 grid (section 5 layout, changed at the owner's request).
export default function Board({ tokens = [], owners = {} }: { tokens?: TokenView[]; owners?: Record<number, OwnerView> }) {
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
                {here.map((k) => <span key={k.seat} className="token" style={{ background: k.color }} title={`Player ${k.seat + 1}`}>{k.token}</span>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
