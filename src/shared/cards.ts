// The 32 cards, texts and amounts exactly as in section 34. Amounts live only here.
export type DeckId = 'fortune' | 'festival';

export type CardEffect =
  | { kind: 'collect'; amount: number }
  | { kind: 'pay'; amount: number }
  | { kind: 'collectFromEach'; amount: number }
  | { kind: 'payEach'; amount: number }
  | { kind: 'payPerBuilding'; house: number; hotel: number }
  | { kind: 'collectPerPlace'; amount: number; max: number }
  | { kind: 'advanceToStart' }
  | { kind: 'back'; steps: number }
  | { kind: 'goToJail' }
  | { kind: 'nearestUnowned' }
  | { kind: 'freeTrip' }
  | { kind: 'jailFree' };

export interface CardDef {
  id: string;
  deck: DeckId;
  festival?: string; // Festival cards are themed one festival per state
  text: string;
  effect: CardEffect;
}

const F = (n: number, text: string, effect: CardEffect): CardDef => ({ id: `fortune-${n}`, deck: 'fortune', text, effect });
const V = (n: number, festival: string | undefined, text: string, effect: CardEffect): CardDef => ({ id: `festival-${n}`, deck: 'festival', festival, text, effect });

export const CARDS: CardDef[] = [
  F(1, 'Bumper coconut harvest: collect 2,000 from the bank.', { kind: 'collect', amount: 2000 }),
  F(2, 'Monsoon flood: pay 1,500 to the bank.', { kind: 'pay', amount: 1500 }),
  F(3, 'Your tea estate wins an export award: collect 3,000 from the bank.', { kind: 'collect', amount: 3000 }),
  F(4, 'Advance to Start and collect your lap salary.', { kind: 'advanceToStart' }),
  F(5, 'Go back three steps.', { kind: 'back', steps: 3 }),
  F(6, 'Go directly to Jail. Do not collect the lap salary.', { kind: 'goToJail' }),
  F(7, 'Advance to the nearest place you do not own. You may buy it at its price, otherwise it goes to auction.', { kind: 'nearestUnowned' }),
  F(8, 'Cyclone warning: pay 500 for each house and 1,000 for each hotel you own, to the bank.', { kind: 'payPerBuilding', house: 500, hotel: 1000 }),
  F(9, 'Stock market gain: collect 2,500 from the bank.', { kind: 'collect', amount: 2500 }),
  F(10, 'Speeding fine on the highway: pay 700 to the bank.', { kind: 'pay', amount: 700 }),
  F(11, 'Get Out of Jail Free. Keep this card until you need it.', { kind: 'jailFree' }),
  F(12, 'Tourism boom: collect 400 from the bank for each place you own, up to a maximum of 4,000.', { kind: 'collectPerPlace', amount: 400, max: 4000 }),
  F(13, 'Your car breaks down: pay 1,200 to the bank.', { kind: 'pay', amount: 1200 }),
  F(14, 'Lucky lottery ticket: collect 4,000 from the bank.', { kind: 'collect', amount: 4000 }),
  F(15, 'Take a free trip to Rest at the Beach.', { kind: 'freeTrip' }),
  F(16, 'Pay each other player 500 for a feast you hosted.', { kind: 'payEach', amount: 500 }),

  V(1, 'Pongal', 'Pongal: the harvest festival gifts you 1,000 from every other player.', { kind: 'collectFromEach', amount: 1000 }),
  V(2, 'Onam', 'Onam: you hosted the grand feast. Pay 1,500 to the bank.', { kind: 'pay', amount: 1500 }),
  V(3, 'Dasara', 'Dasara: festival bonus, collect 2,000 from the bank.', { kind: 'collect', amount: 2000 }),
  V(4, 'Ugadi', 'Ugadi: new year gifts, collect 500 from every other player.', { kind: 'collectFromEach', amount: 500 }),
  V(5, 'Bathukamma', 'Bathukamma: you sponsored the flower festival. Pay 1,000 to the bank.', { kind: 'pay', amount: 1000 }),
  V(6, 'Pongal', 'Pongal: sugarcane sale, collect 1,800 from the bank.', { kind: 'collect', amount: 1800 }),
  V(7, 'Onam', 'Onam: boat race prize, collect 2,500 from the bank.', { kind: 'collect', amount: 2500 }),
  V(8, 'Dasara', 'Dasara: pay 600 to the bank for each house you own for festival decorations.', { kind: 'payPerBuilding', house: 600, hotel: 0 }),
  V(9, 'Ugadi', 'Ugadi: pay 1,200 to the bank for new year shopping.', { kind: 'pay', amount: 1200 }),
  V(10, 'Bathukamma', 'Bathukamma: collect 1,500 from the bank for the best flower stack.', { kind: 'collect', amount: 1500 }),
  V(11, undefined, 'Get Out of Jail Free, a festival blessing. Keep this card until you need it.', { kind: 'jailFree' }),
  V(12, 'Pongal', 'Pongal: advance to Start and collect your lap salary.', { kind: 'advanceToStart' }),
  V(13, 'Onam', 'Onam: pay 800 to the bank for new clothes.', { kind: 'pay', amount: 800 }),
  V(14, 'Dasara', 'Dasara: the royal procession pays you 3,000 from the bank.', { kind: 'collect', amount: 3000 }),
  V(15, 'Ugadi', 'Ugadi: bank error in your favour, collect 2,000 from the bank.', { kind: 'collect', amount: 2000 }),
  V(16, 'Bathukamma', "Bathukamma: pay 700 to the bank for a doctor's visit after the dancing.", { kind: 'pay', amount: 700 }),
];

export const cardById = (id: string): CardDef => CARDS.find((c) => c.id === id)!;
