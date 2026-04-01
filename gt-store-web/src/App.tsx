import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Layout/Header';

import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import SearchResults from './pages/SearchResults';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/Common/Toast';

const Layout = () => (
  <div className="app-layout">
    <Header />
    <main className="main-content">
      <Outlet />
    </main>
  </div>
);

const App = () => {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="cart" element={<Cart />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </NotificationProvider>
  );
};

export default App;
