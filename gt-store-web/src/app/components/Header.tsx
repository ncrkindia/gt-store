import { Link, useNavigate } from "react-router";
import { Search, ShoppingCart, User, Heart, Menu, X, LogOut, LogIn } from "lucide-react";
import { useState } from "react";
import { useKeycloak } from '@react-keycloak/web';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';

const fetchCart = async () => {
  const res = await apiClient.get('/cart');
  return res.data;
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!keycloak.authenticated
  });

  const cartQuantity = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
              <div className="text-white">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl tracking-tight group-hover:scale-105 transition-transform inline-block">ShopKart</span>
                </div>
                <div className="text-[11px] italic">Explore <span className="text-amber-300 font-semibold">Plus+</span></div>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, brands and more"
                  className="w-full px-5 py-3 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-[calc(100%-8px)] px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center rounded-lg transition cursor-pointer"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>

            {/* Right Menu */}
            <div className="flex items-center gap-3 text-white">
              {keycloak.authenticated ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/account" className="flex items-center gap-2 hover:bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl transition">
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium">{keycloak.tokenParsed?.given_name || 'Account'}</span>
                  </Link>
                  <button onClick={() => keycloak.logout({ redirectUri: window.location.origin })} className="flex items-center gap-2 hover:bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl transition cursor-pointer">
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => keycloak.login()} className="hidden md:flex items-center gap-2 hover:bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl transition cursor-pointer">
                  <LogIn className="w-5 h-5" />
                  <span className="text-sm font-medium">Login</span>
                </button>
              )}

              <Link to="/cart" className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 rounded-xl transition">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm font-medium">Cart</span>
                {cartQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-700">
                    {cartQuantity}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden cursor-pointer"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full px-5 py-3 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-[calc(100%-8px)] px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center rounded-lg transition cursor-pointer"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-4 py-3 space-y-2">
            {keycloak.authenticated ? (
              <>
                <Link
                  to="/account"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5 text-gray-600" />
                  <span>My Account</span>
                </Link>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition text-left cursor-pointer"
                  onClick={() => { setIsMenuOpen(false); keycloak.logout({ redirectUri: window.location.origin }); }}
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition text-left cursor-pointer"
                onClick={() => { setIsMenuOpen(false); keycloak.login(); }}
              >
                <LogIn className="w-5 h-5 text-gray-600" />
                <span>Login</span>
              </button>
            )}
            
            <Link
              to="/account/wishlist"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition"
              onClick={() => setIsMenuOpen(false)}
            >
              <Heart className="w-5 h-5 text-gray-600" />
              <span>Wishlist</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
