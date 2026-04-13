import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import BannersPage from './pages/BannersPage';
import OrdersPage from './pages/OrdersPage';
import InventoryPage from './pages/InventoryPage';
import Documentation from './pages/Documentation';
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

  const isAdmin = keycloak.realmAccess?.roles.includes('GTS_ADMIN');
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
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/banners" element={<BannersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/documentation" element={<Documentation />} />
          </Routes>

        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
