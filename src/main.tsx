import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';
import { useSettingsStore } from '@/store/settingsStore';
import { setRuntimeApiKey } from '@/api/client';

// Wire the persisted API key into the API client and keep it in sync.
setRuntimeApiKey(useSettingsStore.getState().apiKey);
useSettingsStore.subscribe((s) => setRuntimeApiKey(s.apiKey));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
