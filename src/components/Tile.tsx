import { propertyOf, CORNER_TILES, type Tile as TileData } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';

export interface OwnerView { token: string; color: string; mortgaged: boolean; houses: number; hotel: boolean }

export default function Tile({ tile, owner }: { tile: TileData; owner?: OwnerView }) {
  const prop = propertyOf(tile);
  const corner = CORNER_TILES.includes(tile.index);
  const cls = ['tile', corner ? 'tile--corner' : '', `tile--${tile.kind}`, tile.state ? `state-${tile.state}` : '', owner?.mortgaged ? 'tile--mortgaged' : ''].join(' ');
  return (
    <div className={cls} data-tile={tile.index}>
      {tile.state && <div className="tile__band" />}
      {owner && <span className="tile__owner" style={{ background: owner.color }} title="Owner">{owner.token}</span>}
      {owner && (owner.houses > 0 || owner.hotel) && (
        <div className="tile__buildings" title="Buildings">{owner.hotel ? '🏨' : ''}{'🏠'.repeat(owner.houses)}</div>
      )}
      {owner?.mortgaged && <div className="tile__lock">🔒 Mortgaged</div>}
      <div className="tile__icon" aria-hidden>{tile.icon}</div>
      <div className="tile__name">{tile.name}</div>
      {prop && <div className="tile__price">{formatRupees(prop.price)}</div>}
    </div>
  );
}
