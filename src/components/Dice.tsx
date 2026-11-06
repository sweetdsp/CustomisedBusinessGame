import { useEffect, useState } from 'react';
import { CONSTANTS } from '../shared/constants.ts';
import { sound } from '../shared/sound.ts';

// Tumbling dice: random faces flicker while rolling, then settle on the real numbers.
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
        <div key={i} className={`die ${rolling ? 'die--tumble' : values ? 'die--settle' : ''}`} style={{ animationDelay: `${i * 0.08}s` }}>
          {shown ? shown[i] : '?'}
        </div>
      ))}
    </div>
  );
}
