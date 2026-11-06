import { cardById } from '../shared/cards.ts';

// Card flips over to show its text. Placeholder illustration; real art comes in stage 11.
export default function CardReveal({ deck, id }: { deck: 'fortune' | 'festival'; id: string }) {
  const card = cardById(id);
  const icon = deck === 'fortune' ? '🎴' : '🎊';
  return (
    <div className={`cardreveal cardreveal--${deck}`} key={id}>
      <div className="cardreveal__head">{icon} {deck === 'fortune' ? 'Fortune' : `Festival${card.festival ? ` · ${card.festival}` : ''}`}</div>
      <div className="cardreveal__text">{card.text}</div>
    </div>
  );
}
