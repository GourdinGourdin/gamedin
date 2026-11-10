import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/schibsted-grotesk';
import './ui/styles.css';
import { gameFromPath } from './seo.ts';
import { App } from './ui/App.tsx';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register(gameFromPath(location.pathname) ? '../sw.js' : './sw.js').catch(() => { /* offline support is optional */ }); });
}
