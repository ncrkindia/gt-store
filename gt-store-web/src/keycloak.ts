import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://pahchaan.slpro.in',
  realm: 'e-pahchaan',
  clientId: 'gt-store-web',
});

export default keycloak;
