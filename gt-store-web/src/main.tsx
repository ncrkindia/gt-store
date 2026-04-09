import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app/App';
import keycloak from './keycloak';
import './styles/index.css';

import { PayPalScriptProvider } from '@paypal/react-paypal-js';

const queryClient = new QueryClient();
const paypalOptions = {
  "clientId": "AXPIq9_r6H9KlJoG9TTar8-A39U1VKyXLuMcccSTnOY7fWpKB3KK6mwWvFECuDI6ZMCWlX0AD8fTwjQ7", // Replace with real client ID in production
  currency: "USD",
  intent: "capture",
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={{ onLoad: 'check-sso', checkLoginIframe: false }}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ReactKeycloakProvider>
    </PayPalScriptProvider>
  </React.StrictMode>,
);
