import { useState } from 'react';
import { propertyOf, CORNER_TILES, flowArrow, type Tile as TileData } from '../shared/board.ts';
import { PHOTOS } from '../shared/photos.ts';
import { formatRupees } from '../shared/design.ts';

export interface OwnerView { token: string; color: string; mortgaged: boolean; houses: number; hotel: boolean }

// Short state labels so the colour band is never the only cue.
export const STATE_CODES: Record<string, string> = { TN: 'TN', KL: 'KL', KA: 'KA', AP: 'AP', TG: 'TG' };

export default function Tile({ tile, owner }: { tile: TileData; owner?: OwnerView }) {
  const prop = propertyOf(tile);
  const photo = tile.kind === 'property' ? PHOTOS[tile.name] : undefined;
  const [broken, setBroken] = useState(false);
  const corner = CORNER_TILES.includes(tile.index);
  const cls = ['tile', corner ? 'tile--corner' : '', `tile--${tile.kind}`, tile.state ? `state-${tile.state}` : '', owner?.mortgaged ? 'tile--mortgaged' : ''].join(' ');
  return (
    <div className={cls} data-tile={tile.index}>
      {tile.state && <div className="tile__band"><span>{STATE_CODES[tile.state]}</span></div>}
      {photo && !broken && <img className="tile__photo" src={photo.url} alt={tile.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />}
      {(!photo || broken) && tile.kind !== 'property' && <div className="tile__icon" aria-hidden>{tile.icon}</div>}
      {owner && <span className="tile__owner" style={{ background: owner.color }} title="Owner">{owner.token}</span>}
      {owner && (owner.houses > 0 || owner.hotel) && (
        <div className="tile__buildings" title="Buildings">{owner.hotel ? '🏨' : ''}{'🏠'.repeat(owner.houses)}</div>
      )}
      {owner?.mortgaged && <div className="tile__lock">🔒 Mortgaged</div>}
      <div className="tile__label">
        <div className="tile__name">{tile.name}</div>
        {prop && <div className="tile__price">{formatRupees(prop.price)}</div>}
      </div>
      <span className="tile__flow" aria-hidden>{flowArrow(tile.index)}</span>
    </div>
  );
}
