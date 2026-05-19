import { useState, useEffect } from "react";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { ProductCard } from "../../components/ProductCard";
import apiClient from "../../../api/axios";
import { useKeycloak } from "@react-keycloak/web";
import type { Product } from "../../types";
import { toast } from "sonner";

interface WishlistItemInfo {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

const API_BASE = "https://gts-api.slpro.in";

function normalizeProduct(p: any): Product {
  const hasDiscount = p.salePrice && p.salePrice < p.price;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description || p.name,
    price: hasDiscount ? p.salePrice : p.price,
    originalPrice: hasDiscount ? p.price : undefined,
    discount: hasDiscount ? Math.round(((p.price - p.salePrice) / p.price) * 100) : undefined,
    rating: p.rating || 0,
    reviews: p.reviewCount || 0,
    image: (() => {
      const img = p.images?.[0];
      if (!p.id || !img) return '';
      if (img.startsWith('http')) return img;
      
      const cleanPath = img.startsWith('/') ? img : '/' + img;
      if (cleanPath.startsWith('/api/media/files/')) {
        return `${API_BASE}${cleanPath}`;
      }
      return `${API_BASE}/api/media/files/${img}`;
    })(),
    images: (p.images || []).map((img: string) => {
      if (img.startsWith('http')) return img;
      const cleanPath = img.startsWith('/') ? img : '/' + img;
      if (cleanPath.startsWith('/api/media/files/')) {
        return `${API_BASE}${cleanPath}`;
      }
      return `${API_BASE}/api/media/files/${img}`;
    }),
    brand: p.brand || "Generic",
    category: p.categoryIds?.[0] || "all",
    inStock: p.inStock !== undefined ? p.inStock : true,
    features: p.features || [],
    ratingBreakdown: p.ratingBreakdown || {},
    reviewsList: p.reviews || [],
  };
}

export function Wishlist() {
  const { keycloak, initialized } = useKeycloak();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<WishlistItemInfo[]>("/users/me/wishlist");
      if (data && data.length > 0) {
        const productIds = data.map((item) => item.productId);
        const productsResponse = await apiClient.post("/products/bulk", productIds);
        setWishlistProducts((productsResponse.data || []).map(normalizeProduct));
      } else {
        setWishlistProducts([]);
      }
    } catch (e) {
      console.error("Failed to load wishlist", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    if (!keycloak.authenticated) {
      keycloak.login();
      return;
    }
    fetchWishlist();
  }, [initialized, keycloak.authenticated]);

  const handleRemove = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    setActionLoading(productId);
    try {
      await apiClient.delete(`/users/me/wishlist/${productId}`);
      setWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) {
      console.error("Failed to remove item", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoveToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    const targetProd = wishlistProducts.find(p => p.id === productId);
    if (targetProd && targetProd.inStock === false) {
      toast.error('This product is out of stock.');
      return;
    }
    setActionLoading(productId);
    try {
      // 1. Add to Cart
      await apiClient.post('/cart/items', {
        productId: productId,
        quantity: 1
      });
      // 2. Remove from Wishlist
      await apiClient.delete(`/users/me/wishlist/${productId}`);
      
      setWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success('Product moved to cart successfully!');
    } catch (e) {
      console.error("Failed to move to cart", e);
      toast.error('Failed to move product to cart.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!initialized || loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
        </div>
        <span className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-sm font-bold">
            {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Heart className="w-20 h-20 text-gray-200 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is lonely</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-8">
            Add items you love to your wishlist and we'll keep them safe for you until you're ready to buy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistProducts.map((product) => (
            <div key={product.id} className="relative group transition-all duration-300">
              <ProductCard product={product} />
              
              {/* Action Overlay */}
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
              
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 z-20">
                <button
                  disabled={actionLoading === product.id || product.inStock === false}
                  className={`bg-white p-3 rounded-full shadow-xl transition-all hover:scale-110 disabled:opacity-50 ${
                    product.inStock === false
                      ? "text-gray-400 hover:bg-white hover:text-gray-400 cursor-not-allowed"
                      : "text-indigo-600 hover:bg-indigo-600 hover:text-white"
                  }`}
                  onClick={(e) => handleMoveToCart(e, product.id)}
                  title={product.inStock === false ? "Out of Stock" : "Move to Cart"}
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
                <button
                  disabled={actionLoading === product.id}
                  className="bg-white text-red-500 hover:bg-red-500 hover:text-white p-3 rounded-full shadow-xl transition-all hover:scale-110 disabled:opacity-50"
                  onClick={(e) => handleRemove(e, product.id)}
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {actionLoading === product.id && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-30">
                    <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
