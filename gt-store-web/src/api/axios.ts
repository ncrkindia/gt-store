import axios from 'axios';
import keycloak from '../keycloak';

const apiClient = axios.create({
  baseURL: 'https://gts-api.slpro.in/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    // If we're authenticated, ensure we have a fresh token
    if (keycloak.authenticated) {
      try {
        // updateToken(5) ensures token is valid for at least another 5s
        // If it's already expired or about to, it will refresh it.
        await keycloak.updateToken(5);
        if (keycloak.token) {
          config.headers.Authorization = `Bearer ${keycloak.token}`;
        }
      } catch (err) {
        console.error('Failed to refresh or retrieve Keycloak token', err);
        // If refresh fails and it's a cold start, we might need to re-login
        // But only do this if it's not a public GET request.
        if (config.method !== 'get') {
           keycloak.login();
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
