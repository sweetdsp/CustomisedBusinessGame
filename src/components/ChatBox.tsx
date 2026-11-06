// Visible placeholder only. Chat works in stage 10.
export default function ChatBox() {
  return (
    <div className="chat">
      <strong>💬 Chat</strong>
      <div className="chat__log"><em>Chat opens in online play.</em></div>
      <div className="chat__emoji" aria-hidden>👍 😀 🎉 👏 😮</div>
    </div>
  );
}
