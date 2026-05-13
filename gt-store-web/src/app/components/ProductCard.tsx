import { Link } from "react-router";
import { Star, Heart } from "lucide-react";
import type { Product } from "../types";
import apiClient from "../../api/axios";
import { formatPrice } from "../../lib/formatPrice";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/p/${product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      className="bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-100"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {product.discount && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            {product.discount}% OFF
          </div>
        )}
        <button
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
          onClick={async (e) => {
            e.preventDefault();
            try {
              await apiClient.post('/users/me/wishlist', { productId: product.id });
              toast.success('Added to wishlist!');
            } catch (err) {
              console.error(err);
              toast.error('Failed to add to wishlist');
            }
          }}
        >
          <Heart className="w-4 h-4 text-rose-500" />
        </button>
      </div>

      <div className="p-5">
        <h3 className="text-sm text-gray-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition font-medium">
          {product.name}
        </h3>

        {product.rating > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-sm">
            <span>{product.rating.toFixed(1)}</span>
            <Star className="w-3 h-3 fill-white" />
          </div>
          <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
        </div>
        )}

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl text-gray-900 font-bold">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <>
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
              <span className="text-xs text-emerald-600 font-semibold">{product.discount}% off</span>
            </>
          )}
        </div>

        {!product.inStock && (
          <div className="text-xs text-red-500">Out of Stock</div>
        )}
      </div>
    </Link>
  );
}
