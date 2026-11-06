import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './shared/design.css';
import './components/board.css';
import './components/panels.css';

createRoot(document.getElementById('root')!).render(<App />);
