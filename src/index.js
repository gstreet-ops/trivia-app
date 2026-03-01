import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { isNative, initNativePlugins } from './utils/capacitor';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// Initialize native plugins (StatusBar, SplashScreen) on Android/iOS
initNativePlugins();

// Register service worker for PWA (skip on native — Capacitor handles offline)
if ('serviceWorker' in navigator && !isNative) {
  window.addEventListener('load', () => {
    // Capacitor builds use PUBLIC_URL=. so SW is at ./service-worker.js
    // GitHub Pages builds use /trivia-app/ prefix
    const swPath = process.env.PUBLIC_URL
      ? `${process.env.PUBLIC_URL}/service-worker.js`
      : '/trivia-app/service-worker.js';
    navigator.serviceWorker.register(swPath)
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}
