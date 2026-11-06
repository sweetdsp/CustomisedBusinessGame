import { PHOTOS } from '../shared/photos.ts';

// Photo credits: each article lists the photographer and licence of its lead image.
export default function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-label="Photo credits">
      <div className="modal__box">
        <h2>📷 Photo credits</h2>
        <p>Town photos come from Wikipedia and Wikimedia Commons, shared under free licences. Open a place to see the photographer and licence.</p>
        <ul className="credits">
          {Object.entries(PHOTOS).map(([name, ph]) => (
            <li key={name}><a href={ph.article} target="_blank" rel="noreferrer">{name}</a></li>
          ))}
        </ul>
        <div className="tm__actions"><button className="btn btn--glow" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
