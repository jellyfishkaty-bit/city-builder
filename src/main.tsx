import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.DEV) {
  import('./game/store').then(({ useGameStore }) => {
    // dev-only hook for balance testing via the console; stripped from prod builds
    (window as unknown as { __gameStore: typeof useGameStore }).__gameStore = useGameStore;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
