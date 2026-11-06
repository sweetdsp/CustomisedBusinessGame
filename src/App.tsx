export default function App() {
  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon)' }}>
        Five States Business Game
      </h1>
      <p>Coming soon: more stages are being built.</p>
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
        <button className="btn" disabled>Create Game</button>
        <button className="btn" disabled>Join Game</button>
      </div>
    </main>
  );
}
