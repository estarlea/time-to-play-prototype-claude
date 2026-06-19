import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import posthog from 'posthog-js';

// PostHog — replace with your project API key from posthog.com
posthog.init('phc_uYeRLetDDtAoBA9SYsjzw7rzXik9EEQLDF5weukRYZ33', {
  api_host: 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
