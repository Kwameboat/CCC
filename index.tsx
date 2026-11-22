import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LiveServicePage from './components/LiveServicePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import PwaUpdateToast from './components/PwaUpdateToast';
import { registerServiceWorker } from './lib/pwa';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

registerServiceWorker();

// Public member-facing page (no staff login): /live
const isLiveRoute = /^\/live\/?$/.test(window.location.pathname);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isLiveRoute ? <LiveServicePage /> : <App />}
      <PwaUpdateToast />
    </ErrorBoundary>
  </React.StrictMode>
);
