import { useState } from 'react';
import type { ChatMsg } from '../server/types.ts';

const EMOJI = ['👍', '😀', '🎉', '👏', '😮'];

// Text chat with quick emoji reactions (online play). Local play shows a note instead.
export default function ChatBox({ chat }: { chat: { messages: ChatMsg[]; send: (t: string) => void } | null }) {
  const [text, setText] = useState('');
  if (!chat) {
    return <div className="chat"><strong>💬 Chat</strong><div className="chat__log"><em>Chat opens in online games.</em></div></div>;
  }
  const submit = () => { if (text.trim()) { chat.send(text); setText(''); } };
  return (
    <div className="chat">
      <strong>💬 Chat</strong>
      <div className="chat__log" aria-live="polite">
        {chat.messages.slice(-8).map((m, i) => <div key={i}><b>{m.name}:</b> {m.text}</div>)}
        {chat.messages.length === 0 && <em>Say hello!</em>}
      </div>
      <div className="chat__emoji">
        {EMOJI.map((e) => <button key={e} className="chip" onClick={() => chat.send(e)} aria-label={`Send ${e}`}>{e}</button>)}
      </div>
      <div className="chat__row">
        <input value={text} maxLength={200} placeholder="Type a message" aria-label="Chat message" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="btn" onClick={submit}>Send</button>
      </div>
    </div>
  );
}
