import { Heart, Trash2 } from "lucide-react";
import { products } from "../../data/mockData";
import { ProductCard } from "../../components/ProductCard";

export function Wishlist() {
  // Mock wishlist items (first 4 products)
  const wishlistItems = products.slice(0, 4);

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl">My Wishlist</h2>
        <span className="text-gray-600">{wishlistItems.length} items</span>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Your wishlist is empty</p>
          <p className="text-sm text-gray-500 mb-6">
            Add items to your wishlist and they will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wishlistItems.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} />
              <button
                className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:bg-red-50 transition z-10"
                onClick={(e) => {
                  e.preventDefault();
                  // Remove from wishlist logic
                }}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
