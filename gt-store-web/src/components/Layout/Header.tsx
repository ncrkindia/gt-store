import React from 'react';
import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const Header = () => {
  const { keycloak, initialized } = useKeycloak();

  const handleLogin = () => {
    keycloak.login();
  };

  const handleLogout = () => {
    keycloak.logout();
  };

  return (
    <header className="glass-header">
      <div className="header-brand">
        <Link to="/" className="brand-link">
          GT Store
        </Link>
      </div>

      <nav className="header-nav">
        <Link to="/products" className="nav-link">Catalog</Link>
        <Link to="/cart" className="nav-link">Cart</Link>
      </nav>

      <div className="header-actions">
        {!initialized && <span>Loading Auth...</span>}
        {initialized && !keycloak.authenticated && (
          <button onClick={handleLogin} className="primary-btn">
            Login
          </button>
        )}
        {initialized && keycloak.authenticated && (
          <div className="user-menu">
            <span className="user-name">
              {keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'User'}
            </span>
            <Link to="/profile" className="nav-link profile-link">Profile</Link>
            <button onClick={handleLogout} className="secondary-btn">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
