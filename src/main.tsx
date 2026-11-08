import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initConsoleSentinel } from './lib/consoleSentinel.ts';

// Initialize AI Console Sentinel & Cognitive Brain Reporter
initConsoleSentinel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
