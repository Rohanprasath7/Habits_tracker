// Polyfill process for browser environment at the absolute top
if (typeof window !== 'undefined' && !window.process) {
  (window as any).process = { env: {} };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Bare Minimum Test</h1>
      <p>If you see this, the environment is working.</p>
    </div>
  );
} catch (error: any) {
  console.error("Critical boot error:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; color: #ef4444; background: #fee2e2; height: 100vh;">
      <h1 style="font-size: 20px; margin-bottom: 10px;">Startup Error</h1>
      <pre style="white-space: pre-wrap; font-size: 12px; line-height: 1.5;">${error.message}\n\n${error.stack}</pre>
      <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">Reload App</button>
    </div>
  `;
}
