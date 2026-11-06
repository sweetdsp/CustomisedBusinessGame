import { propertyOf, CORNER_TILES, type Tile as TileData } from '../shared/board.ts';
import { formatRupees } from '../shared/design.ts';

export interface OwnerView { token: string; color: string; mortgaged: boolean }

export default function Tile({ tile, owner }: { tile: TileData; owner?: OwnerView }) {
  const prop = propertyOf(tile);
  const corner = CORNER_TILES.includes(tile.index);
  const cls = ['tile', corner ? 'tile--corner' : '', `tile--${tile.kind}`, tile.state ? `state-${tile.state}` : ''].join(' ');
  return (
    <div className={cls} data-tile={tile.index}>
      {tile.state && <div className="tile__band" />}
      {owner && <span className="tile__owner" style={{ background: owner.color }} title="Owner">{owner.token}</span>}
      <div className="tile__icon" aria-hidden>{tile.icon}</div>
      <div className="tile__name">{tile.name}</div>
      {prop && <div className="tile__price">{formatRupees(prop.price)}</div>}
    </div>
  );
}
