import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import BannersPage from './pages/BannersPage';
import OrdersPage from './pages/OrdersPage';
import InventoryPage from './pages/InventoryPage';
import Documentation from './pages/Documentation';
import ReviewsPage from './pages/ReviewsPage';
import ShippingPage from './pages/ShippingPage';
import SupportPage from './pages/SupportPage';
import OrderDetailPage from './pages/OrderDetailPage';
import Sidebar from './components/Sidebar';
import { AdminHeader } from './components/AdminHeader';
import { AdminFooter } from './components/AdminFooter';
import { Toaster } from 'sonner';
import { ShieldAlert } from 'lucide-react';
const PageTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = "Admin Portal | GT Store";

    if (path.includes("/dashboard")) {
      title = "Dashboard | GT Admin";
    } else if (path.includes("/products")) {
      title = "Product Management | GT Admin";
    } else if (path.includes("/categories")) {
      title = "Categories | GT Admin";
    } else if (path.includes("/brands")) {
      title = "Brands Manager | GT Admin";
    } else if (path.includes("/banners")) {
      title = "Banner Promos | GT Admin";
    } else if (path.includes("/inventory")) {
      title = "Inventory Analytics | GT Admin";
    } else if (path.includes("/orders/")) {
      const parts = path.split("/orders/");
      const ordId = parts[1] ? parts[1].substring(0, 8) : "";
      title = `Order #${ordId.toUpperCase()} | GT Admin`;
    } else if (path.includes("/orders")) {
      title = "Sales Orders Ledger | GT Admin";
    } else if (path.includes("/reviews")) {
      title = "Reviews & Ratings | GT Admin";
    } else if (path.includes("/support/")) {
      const parts = path.split("/support/");
      const tkt = parts[1] ? parts[1] : "";
      title = `Ticket ${tkt.toUpperCase()} | GT Admin`;
    } else if (path.includes("/support")) {
      title = "Support Center | GT Admin";
    } else if (path.includes("/shipping")) {
      title = "Shipping Modules | GT Admin";
    } else if (path.includes("/documentation")) {
      title = "Documentation | GT Admin";
    }

    document.title = title;
  }, [location]);

  return null;
};


function App() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!keycloak.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-white/10 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <ShieldAlert className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Portal</h1>
          <p className="text-slate-500 mb-8 font-medium">GT Store Administrative Security Verification</p>
          
          <button 
            onClick={() => keycloak.login()} 
            className="w-full btn-primary text-base py-3.5 shadow-lg shadow-indigo-500/30"
          >
            Sign in to System
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = keycloak.realmAccess?.roles.includes('GTS_ADMIN');
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
         <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center max-w-md">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">403 Forbidden</h2>
            <p className="text-slate-500 mb-4">Your account lacks administrative privileges required for this environment.</p>
            <button onClick={() => keycloak.logout()} className="text-indigo-600 text-sm font-semibold hover:underline">Sign Out</button>
         </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/admin">
      <PageTitleManager />
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Toaster position="top-center" richColors />
        
        {/* Global Admin Header (Sticky top) */}
        <AdminHeader />
        
        <div className="flex flex-1 w-full">
          {/* Sidebar Navigation */}
          <Sidebar />
          
          {/* Main Dynamic Area */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Background subtle gradients mirroring main-store Content feel */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

            <div className="flex-1 overflow-y-auto relative z-10 p-8 flex flex-col">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/banners" element={<BannersPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/support/:ticketNumber" element={<SupportPage />} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/documentation" element={<Documentation />} />
              </Routes>

              {/* Admin Footer */}
              <div className="mt-16">
                <AdminFooter />
              </div>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
