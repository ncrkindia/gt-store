import { Link } from "react-router";
import { Star, Heart } from "lucide-react";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/product/${product.id}`}
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
          onClick={(e) => {
            e.preventDefault();
            // Add to wishlist logic
          }}
        >
          <Heart className="w-4 h-4 text-rose-500" />
        </button>
      </div>

      <div className="p-5">
        <h3 className="text-sm text-gray-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition font-medium">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-sm">
            <span>{product.rating}</span>
            <Star className="w-3 h-3 fill-white" />
          </div>
          <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl text-gray-900 font-bold">${product.price}</span>
          {product.originalPrice && (
            <>
              <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
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
