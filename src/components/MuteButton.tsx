import { useEffect, useState } from 'react';
import { isMuted, onMuteChange, setMuted, sound } from '../shared/sound.ts';

// Easy mute control for all sounds (section 20.8).
export default function MuteButton() {
  const [m, setM] = useState(isMuted());
  useEffect(() => onMuteChange(() => setM(isMuted())), []);
  return (
    <button className="mute" aria-pressed={m} aria-label={m ? 'Turn sound on' : 'Mute sound'} onClick={() => { setMuted(!m); if (m) sound.click(); }}>
      {m ? '🔇' : '🔊'}
    </button>
  );
}
