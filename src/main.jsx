import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initGoogleAuth } from './services/driveService'
import { startAutoSync } from './services/syncService'

// Initialize Google auth and auto-sync on app load
initGoogleAuth().then(() => {
  startAutoSync();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
