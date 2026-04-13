import { useParams, Link } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import type { Product } from '../types';
import { formatPrice } from '../../lib/formatPrice';

const fetchProducts = async () => {
  const res = await apiClient.get('/products');
  return (res.data.content || []).map((p: any) => {
    let originalPrice = undefined;
    let price = p.price;
    let discount = undefined;
    if (p.salePrice && p.salePrice < p.price) {
      originalPrice = p.price;
      price = p.salePrice;
      discount = Math.round(((p.price - p.salePrice) / p.price) * 100);
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description || p.name,
      price: price,
      originalPrice: originalPrice,
      discount: discount,
      rating: p.rating || 0,
      reviews: p.reviewCount || 0,
      image: (p.images && p.images.length > 0) ? p.images[0] : '',
      images: p.images || [],
      brand: p.brand || 'Generic',
      category: (p.categoryIds && p.categoryIds.length > 0) ? p.categoryIds[0] : 'all',
      inStock: p.inStock !== undefined ? p.inStock : true,
      features: p.features || []
    };
  });
};

export function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [sortBy, setSortBy] = useState("popularity");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  if (isLoading) return <div className="p-16 text-center text-xl">Loading products...</div>;
  if (error) return <div className="p-16 text-center text-xl text-red-500">Error loading products.</div>;

  const categoryName = category || 'all';

  const filteredProducts = products
    .filter((p) => {
      if (category && category !== "all" && category !== "deals" && category !== "trending" && category !== "top-rated") {
        return p.category?.toLowerCase() === category.toLowerCase();
      }
      return true;
    })
    .filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    .filter((p) => {
      if (selectedRatings.length === 0) return true;
      return selectedRatings.some((rating) => p.rating >= rating);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        default:
          return b.reviews - a.reviews;
      }
    });

  const toggleRating = (rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Link to="/" className="hover:text-indigo-600">Home</Link>
                <span>/</span>
                <span className="text-gray-900 capitalize font-semibold">
                  {categoryName}
                </span>
              </div>
              <h1 className="text-3xl font-bold capitalize bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{categoryName}</h1>
              <p className="text-sm text-gray-600">
                Showing {filteredProducts.length} products
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-2 border-2 border-indigo-300 text-indigo-600 rounded-xl hover:bg-indigo-50 font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside
            className={`w-64 flex-shrink-0 space-y-6 ${
              showFilters ? "block" : "hidden md:block"
            }`}
          >
            {/* Price Filter */}
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
              <h3 className="mb-4 flex items-center justify-between font-semibold text-lg">
                <span>Price Range</span>
              </h3>
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
              <h3 className="mb-4 font-semibold text-lg">Customer Ratings</h3>
              <div className="space-y-2">
                {[4.5, 4, 3.5, 3].map((rating) => (
                  <label key={rating} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRatings.includes(rating)}
                      onChange={() => toggleRating(rating)}
                      className="rounded"
                    />
                    <span className="text-sm">{rating}★ & above</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort Bar */}
            <div className="bg-white rounded-2xl p-5 mb-6 flex items-center justify-between shadow-lg border border-gray-100">
              <span className="text-sm text-gray-700 font-semibold">
                Sort by:
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSortBy("popularity")}
                  className={`px-5 py-2.5 text-sm rounded-xl transition font-medium ${
                    sortBy === "popularity"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Popularity
                </button>
                <button
                  onClick={() => setSortBy("price-low")}
                  className={`px-5 py-2.5 text-sm rounded-xl transition font-medium ${
                    sortBy === "price-low"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Price: Low to High
                </button>
                <button
                  onClick={() => setSortBy("price-high")}
                  className={`px-5 py-2.5 text-sm rounded-xl transition font-medium ${
                    sortBy === "price-high"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Price: High to Low
                </button>
              </div>
            </div>

            {/* Products */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center shadow-lg">
                <p className="text-gray-600 text-lg mb-6">No products found</p>
                <button
                  onClick={() => {
                    setPriceRange([0, 500000]);
                    setSelectedRatings([]);
                  }}
                  className="text-indigo-600 hover:text-purple-600 font-semibold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
