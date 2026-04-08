import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

if (import.meta.env.DEV && !clerkPubKey) {
  console.warn('[City Watch] VITE_CLERK_PUBLISHABLE_KEY is not set — authentication disabled');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {clerkPubKey ? (
      <ClerkProvider publishableKey={clerkPubKey}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
