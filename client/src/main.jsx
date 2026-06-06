import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.update();
    }).catch(() => {
      // The app remains usable if the browser blocks service workers.
    });
  });

  window.addEventListener('online', () => {
    navigator.serviceWorker.ready.then((registration) => registration.update());
  });
}
