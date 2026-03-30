import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';

function App() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return <div className="loading">Initializing...</div>;
  }

  if (!keycloak.authenticated) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Admin Portal</h1>
          <p>GT Store Administrative Access</p>
          <button onClick={() => keycloak.login()} className="btn-primary">Secure Login</button>
        </div>
      </div>
    );
  }

  const isAdmin = keycloak.realmAccess?.roles.includes('admin');
  if (!isAdmin) {
    return <div className="error-screen"><h2>403 Forbidden</h2><p>You lack administrative privileges.</p></div>;
  }

  return (
    <BrowserRouter basename="/admin">
      <div className="app-container">
        <Sidebar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
