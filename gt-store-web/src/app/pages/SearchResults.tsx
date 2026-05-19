import { useSearchParams, Link, useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Heart, Star, ArrowRight, Search, Package, CheckCircle, XCircle } from "lucide-react";
import apiClient from "../../api/axios";
import { useQuery } from '@tanstack/react-query';
import { useKeycloak } from "@react-keycloak/web";
import { formatPrice } from "../../lib/formatPrice";

const API_BASE = "https://gts-api.slpro.in";

const resolveImg = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;
  return `${API_BASE}/api/media/files/${img}`;
};

interface SearchResult {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  brand: string;
  categoryIds: string[];
  imageUrl: string;
  rating: number;
  reviewCount: number;
  features: string[];
  inStock: boolean;
}

const fetchCategories = async () => {
  const res = await apiClient.get('/categories');
  return res.data || [];
};

export function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingCart, setAddingCart] = useState<string | null>(null);
  const [addingWishlist, setAddingWishlist] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: "cart" | "wishlist" } | null>(null);

  const { data: categories = [] } = useQuery<{id: string, name: string, slug: string}[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  // Sorting & filtering state
  const [sortBy, setSortBy] = useState("relevance");
  const [filterInStock, setFilterInStock] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    apiClient
      .get(`/search?q=${encodeURIComponent(q)}&size=40`)
      .then((res) => setResults(res.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [q]);

  const filteredResults = results
    .filter((r) => !filterInStock || r.inStock !== false)
    .sort((a, b) => {
      if (sortBy === "price_asc") return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
      if (sortBy === "price_desc") return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  const flashFeedback = (id: string, type: "cart" | "wishlist") => {
    setFeedback({ id, type });
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddToCart = async (product: SearchResult) => {
    if (!keycloak.authenticated) { keycloak.login(); return; }
    if (product.inStock === false) return;
    setAddingCart(product.id);
    try {
      await apiClient.post("/cart/items", { productId: product.id, quantity: 1 });
      flashFeedback(product.id, "cart");
    } catch (e) { console.error(e); }
    finally { setAddingCart(null); }
  };

  const handleAddToWishlist = async (product: SearchResult) => {
    if (!keycloak.authenticated) { keycloak.login(); return; }
    setAddingWishlist(product.id);
    try {
      await apiClient.post("/users/me/wishlist", { productId: product.id });
      flashFeedback(product.id, "wishlist");
    } catch (e) { console.error(e); }
    finally { setAddingWishlist(null); }
  };

  const effectivePrice = (r: SearchResult) => r.salePrice && r.salePrice < r.price ? r.salePrice : r.price;
  const discount = (r: SearchResult) =>
    r.salePrice && r.salePrice < r.price
      ? Math.round(((r.price - r.salePrice) / r.price) * 100)
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 py-5 px-4">
        <div className="max-w-screen-xl mx-auto">
          <p className="text-sm text-gray-500 mb-1">
            {loading ? "Searching..." : `${filteredResults.length} results for`}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">"{q}"</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Filters & Sort Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterInStock}
              onChange={(e) => setFilterInStock(e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            In Stock Only
          </label>
          <span className="ml-auto text-sm text-gray-400">{filteredResults.length} results</span>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 flex gap-5 animate-pulse border border-gray-100">
                <div className="w-32 h-32 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && filteredResults.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No results found</h2>
            <p className="text-gray-500 mb-6">Try different keywords or browse all categories.</p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition"
            >
              Browse Products <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Results List */}
        {!loading && filteredResults.length > 0 && (
          <div className="space-y-4">
            {filteredResults.map((result) => {
              const disc = discount(result);
              const price = effectivePrice(result);
              const isFeedbackCart = feedback?.id === result.id && feedback?.type === "cart";
              const isFeedbackWish = feedback?.id === result.id && feedback?.type === "wishlist";
              return (
                <div
                  key={result.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex gap-5 group"
                >
                  {/* Product Image */}
                  <Link to={`/p/${result.slug || result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="shrink-0">
                    <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      {result.imageUrl ? (
                        <img
                          src={resolveImg(result.imageUrl)}
                          alt={result.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/128x128/f3f4f6/9ca3af?text=IMG`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Brand + Category Tags */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {result.brand && (
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {result.brand}
                            </span>
                          )}
                          {result.categoryIds?.slice(0, 2).map((catId) => {
                            const matched = categories.find(c => c.id === catId || c.slug === catId);
                            const displayName = matched ? matched.name : catId;
                            // Prevent raw mongo id leaks visually
                            if (/^[0-9a-fA-F]{24}$/.test(displayName)) return null;
                            return (
                              <span key={catId} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                                {displayName}
                              </span>
                            );
                          })}
                          {result.inStock === false ? (
                            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> In Stock
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <Link to={`/p/${result.slug || result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          <h3 className="font-semibold text-gray-900 text-base hover:text-indigo-600 transition line-clamp-2 leading-snug">
                            {result.name}
                          </h3>
                        </Link>

                        {/* Description */}
                        {result.description && (
                          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{result.description}</p>
                        )}

                        {/* Key Features */}
                        {result.features?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {result.features.slice(0, 3).map((f, i) => (
                              <span key={i} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price + Actions column */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Price */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{formatPrice(price?.toFixed ? parseFloat(price.toFixed(2)) : price)}</div>
                          {disc && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-sm text-gray-400 line-through">{formatPrice(result.price?.toFixed ? parseFloat(result.price.toFixed(2)) : result.price)}</span>
                              <span className="text-xs text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">{disc}% off</span>
                            </div>
                          )}
                        </div>

                        {/* Rating */}
                        {result.rating ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 bg-amber-400 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                              {result.rating.toFixed(1)} <Star className="w-3 h-3 fill-white ml-0.5" />
                            </div>
                            <span className="text-xs text-gray-400">({result.reviewCount || 0})</span>
                          </div>
                        ) : null}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAddToWishlist(result)}
                            disabled={addingWishlist === result.id}
                            className={`p-2 rounded-xl border transition ${
                              isFeedbackWish
                                ? "bg-pink-50 border-pink-300 text-pink-500"
                                : "border-gray-200 text-gray-500 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-500"
                            }`}
                            title="Add to Wishlist"
                          >
                            <Heart className={`w-4 h-4 ${isFeedbackWish ? "fill-pink-500" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleAddToCart(result)}
                            disabled={addingCart === result.id || result.inStock === false}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                              isFeedbackCart
                                ? "bg-green-500 text-white"
                                : result.inStock === false
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {isFeedbackCart ? (
                              <><CheckCircle className="w-4 h-4" /> Added!</>
                            ) : result.inStock === false ? (
                              "Out of Stock"
                            ) : (
                              <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
                            )}
                          </button>
                          <Link
                            to={`/p/${result.slug || result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            View <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
