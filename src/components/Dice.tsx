import { useEffect, useState } from 'react';
import { CONSTANTS } from '../shared/constants.ts';
import { sound } from '../shared/sound.ts';

// Pip positions on a 3 by 3 face (cells 0-8, left to right, top to bottom) for 0 to 8 dots.
const PIPS: number[][] = [
  [],
  [4],
  [0, 8],
  [0, 4, 8],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
  [0, 2, 3, 4, 5, 6, 8],
  [0, 1, 2, 3, 5, 6, 7, 8],
];

function Face({ n, cls }: { n: number | null; cls: string }) {
  return (
    <div className={`die ${cls} ${n === null || n === 0 ? 'die--blank' : ''}`} role="img" aria-label={n === null ? 'Dice not rolled' : `${n} dots`}>
      {n === null ? '?' : Array.from({ length: 9 }, (_, cell) => (
        PIPS[n].includes(cell) ? <span key={cell} className="die__pip" style={{ gridArea: `${Math.floor(cell / 3) + 1} / ${(cell % 3) + 1}` }} /> : null
      ))}
    </div>
  );
}

// Tumbling dice that settle on dot patterns (a blank face means zero).
export default function Dice({ values, rolling }: { values: [number, number] | null; rolling: boolean }) {
  const [flicker, setFlicker] = useState<[number, number]>([1, 2]);
  useEffect(() => {
    if (!rolling) return;
    sound.dice();
    const id = setInterval(() => {
      const f = () => Math.floor(Math.random() * (CONSTANTS.DICE_MAX_FACE + 1));
      setFlicker([f(), f()]);
    }, 80);
    return () => clearInterval(id);
  }, [rolling]);
  const shown = rolling ? flicker : values;
  return (
    <div className="dice" aria-live="polite">
      {[0, 1].map((i) => (
        <Face key={i} n={shown ? shown[i] : null} cls={rolling ? 'die--tumble' : values ? 'die--settle' : ''} />
      ))}
    </div>
  );
}
