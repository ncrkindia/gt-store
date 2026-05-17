import { Link, useNavigate } from "react-router";
import { Search, ShoppingCart, User, Heart, Menu, X, LogOut, LogIn } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useKeycloak } from '@react-keycloak/web';
import { useQuery } from '@tanstack/react-query';
import { formatPrice } from "../../lib/formatPrice";
import apiClient from '../../api/axios';

const API_BASE = "https://gts-api.slpro.in";
const resolveImg = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;
  return `${API_BASE}/api/media/files/${img}`;
};

const fetchCart = async () => {
  const res = await apiClient.get('/cart');
  return res.data;
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!keycloak.authenticated
  });

  const productIds = cart?.items?.map((item: any) => item.productId) || [];

  const { data: products } = useQuery({
    queryKey: ['products-bulk-header', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const res = await apiClient.post('/products/bulk', productIds);
      return res.data || [];
    },
    enabled: productIds.length > 0
  });

  const cartQuantity = cart?.items?.reduce((acc: number, item: any) => {
    if (products) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) return acc; // Exclude unlisted or missing products
    }
    return acc + item.quantity;
  }, 0) || 0;

  const { data: wishlist = [] } = useQuery<any[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await apiClient.get('/users/me/wishlist');
      return res.data || [];
    },
    enabled: !!keycloak.authenticated
  });

  const wishlistProductIds = wishlist.map((item: any) => item.productId) || [];

  const { data: wishlistProductsData } = useQuery({
    queryKey: ['products-bulk-wishlist-header', wishlistProductIds],
    queryFn: async () => {
      if (wishlistProductIds.length === 0) return [];
      const res = await apiClient.post('/products/bulk', wishlistProductIds);
      return res.data || [];
    },
    enabled: wishlistProductIds.length > 0
  });

  const wishlistQuantity = wishlist.reduce((acc: number, item: any) => {
    if (wishlistProductsData) {
      const product = wishlistProductsData.find((p: any) => p.id === item.productId);
      if (!product) return acc; // Exclude unlisted products
    }
    return acc + 1;
  }, 0);

  // Debounced suggestions — fires 2 seconds after user stops typing
  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await apiClient.get(`/search/suggest?q=${encodeURIComponent(q)}`);
        const data = res.data?.slice(0, 6) || [];
        setSuggestions(data);
        if (data.length > 0) setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 2000); // 2 second pause
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    fetchSuggestions(e.target.value);
  };

  const handleSuggestionClick = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate(`/search?q=${encodeURIComponent(name)}`);
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
                  <span className="text-2xl tracking-tight group-hover:scale-105 transition-transform inline-block">GT Store</span>
                </div>
                <div className="text-[11px] italic">Explore <span className="text-amber-300 font-semibold">Deals+</span></div>
              </div>
            </Link>

            {/* Desktop Search — inlined JSX to prevent focus loss */}
            <div ref={searchContainerRef} className="flex-1 max-w-2xl hidden md:block relative">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search products, brands, categories..."
                    className="w-full px-5 py-3 pr-14 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-lg"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-[calc(100%-8px)] px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center rounded-lg transition cursor-pointer"
                  >
                    {suggestLoading
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Search className="w-5 h-5 text-white" />
                    }
                  </button>
                </div>
              </form>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onMouseDown={() => handleSuggestionClick(s.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition text-left group"
                    >
                      {s.imageUrl ? (
                        <img
                          src={resolveImg(s.imageUrl)}
                          alt={s.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.brand || s.categoryIds?.[0] || ''}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 shrink-0">
                        {formatPrice(s.salePrice ?? s.price)}
                      </span>
                    </button>
                  ))}
                  <button
                    onMouseDown={() => {
                      setShowSuggestions(false);
                      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="w-full px-4 py-3 text-sm text-indigo-600 font-medium hover:bg-indigo-50 transition border-t border-gray-100 text-left flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    See all results for "{searchQuery}"
                  </button>
                </div>
              )}
            </div>

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

              <Link to="/account/wishlist" className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 rounded-xl transition">
                <Heart className="w-5 h-5" />
                <span className="text-sm font-medium">Wishlist</span>
                {wishlistQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-700">
                    {wishlistQuantity}
                  </span>
                )}
              </Link>

              <Link to="/cart" className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 rounded-xl transition">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm font-medium">Cart</span>
                {cartQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-700">
                    {cartQuantity}
                  </span>
                )}
              </Link>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden cursor-pointer">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search — also inlined */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  placeholder="Search products..."
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
                <Link to="/account" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition" onClick={() => setIsMenuOpen(false)}>
                  <User className="w-5 h-5 text-gray-600" />
                  <span>My Account</span>
                </Link>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition text-left cursor-pointer" onClick={() => { setIsMenuOpen(false); keycloak.logout({ redirectUri: window.location.origin }); }}>
                  <LogOut className="w-5 h-5 text-gray-600" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition text-left cursor-pointer" onClick={() => { setIsMenuOpen(false); keycloak.login(); }}>
                <LogIn className="w-5 h-5 text-gray-600" />
                <span>Login</span>
              </button>
            )}
            <Link to="/account/wishlist" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition" onClick={() => setIsMenuOpen(false)}>
              <Heart className="w-5 h-5 text-gray-600" />
              <span>Wishlist</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
