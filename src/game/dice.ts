import { CONSTANTS } from '../shared/constants.ts';
import type { Rng } from './types.ts';

const face = (rng: Rng) =>
  CONSTANTS.DICE_MIN_FACE + Math.floor(rng() * (CONSTANTS.DICE_MAX_FACE - CONSTANTS.DICE_MIN_FACE + 1));

// Two dice, faces 0-8. If both show 0, roll both again (section 8).
export function rollDice(rng: Rng): [number, number] {
  for (;;) {
    const a = face(rng);
    const b = face(rng);
    if (a + b > 0) return [a, b];
  }
}
