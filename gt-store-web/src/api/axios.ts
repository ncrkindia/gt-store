import axios from 'axios';
import keycloak from '../keycloak';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated && keycloak.token) {
      // Ensure token is somewhat fresh before sending (e.g. 5 seconds min)
      try {
        await keycloak.updateToken(5);
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      } catch (err) {
        console.error('Failed to refresh Keycloak token', err);
        keycloak.login();
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
