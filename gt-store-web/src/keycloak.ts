import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8180',
  realm: 'gt-store',
  clientId: 'gt-store-web',
});

export default keycloak;
