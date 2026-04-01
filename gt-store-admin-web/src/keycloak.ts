import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'https://pahchaan.slpro.in',
  realm: 'e-pahchaan',
  clientId: 'gt-store-web',
};

const keycloak = new Keycloak(keycloakConfig);
export default keycloak;
