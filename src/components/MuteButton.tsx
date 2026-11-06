import { useEffect, useState } from 'react';
import { isMuted, onMuteChange, setMuted, speak } from '../shared/sound.ts';

// Easy mute control for all sounds (section 20.8).
export default function MuteButton() {
  const [m, setM] = useState(isMuted());
  useEffect(() => onMuteChange(() => setM(isMuted())), []);
  return (
    <button className="mute" aria-pressed={m} aria-label={m ? 'Turn voice on' : 'Mute voice'} title={m ? 'Voice is off' : 'Voice is on'} onClick={() => { setMuted(!m); if (m) speak('Voice on'); }}>
      {m ? '🔇' : '🔊'}
    </button>
  );
}
