import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'http://localhost:8180',
  realm: 'gt-store',
  clientId: 'gt-store-web',
};

const keycloak = new Keycloak(keycloakConfig);
export default keycloak;
