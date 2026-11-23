import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LiveServicePage from './components/LiveServicePage';
import WebsitePage from './components/website/WebsitePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import PwaUpdateToast from './components/PwaUpdateToast';
import { registerServiceWorker } from './lib/pwa';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

registerServiceWorker();

// Routes:  /           public church website
//          /live       public online service page
//          /console/*  staff console (login required)
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isStandalone =
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// The installed staff app used to open "/"; send it to the console instead of the website.
if (path === '/' && isStandalone) {
  window.location.replace('/console');
}

const page: 'website' | 'live' | 'console' =
  path === '/live' ? 'live' : path === '/console' || path.startsWith('/console/') ? 'console' : 'website';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {page === 'live' ? <LiveServicePage /> : page === 'console' ? <App /> : <WebsitePage />}
      <PwaUpdateToast />
    </ErrorBoundary>
  </React.StrictMode>
);
