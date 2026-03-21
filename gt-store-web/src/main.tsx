import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import keycloak from './keycloak';
import './index.css';
import './pages.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactKeycloakProvider 
      authClient={keycloak}
      initOptions={{ onLoad: 'check-sso', checkLoginIframe: false }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ReactKeycloakProvider>
  </React.StrictMode>,
);
