import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Force refresh stale service workers so users don't get stuck on cached
// old versions. This runs once on page load — if a SW is active and
// waiting, it tells it to activate immediately and reloads the page.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      // If there's a waiting worker, skip waiting and reload
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
        return;
      }
      registration.update();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);