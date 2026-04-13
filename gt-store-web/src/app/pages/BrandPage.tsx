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
  return (res.data.content || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || p.name,
      price: p.salePrice || p.price,
      originalPrice: p.salePrice ? p.price : undefined,
      discount: p.salePrice ? Math.round(((p.price - p.salePrice) / p.price) * 100) : undefined,
      rating: p.rating || 0,
      reviews: p.reviewCount || 0,
      image: (p.images && p.images.length > 0) ? p.images[0] : '',
      images: p.images || [],
      brand: p.brand || 'Generic',
      category: (p.categoryIds && p.categoryIds.length > 0) ? p.categoryIds[0] : 'all',
      inStock: p.inStock !== undefined ? p.inStock : true,
      features: p.features || []
  }));
};

const fetchBrandInfo = async (slug: string) => {
  try {
    const res = await apiClient.get(`/brands/slug/${slug}`);
    return res.data;
  } catch (err) {
    return null;
  }
};

export function BrandPage() {
  const { brand: brandSlug } = useParams<{ brand: string }>();
  const [sortBy, setSortBy] = useState("popularity");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: brandInfo } = useQuery({
    queryKey: ['brand', brandSlug],
    queryFn: () => fetchBrandInfo(brandSlug || ''),
    enabled: !!brandSlug
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  if (isLoading) return <div className="p-16 text-center text-xl">Loading brands...</div>;

  const brandName = brandInfo?.name || brandSlug || 'Brand';

  const filteredProducts = products
    .filter((p) => {
        // Match brand name or slug (fallback)
        if (brandInfo) {
            return p.brand?.toLowerCase() === brandInfo.name.toLowerCase();
        }
        return p.brand?.toLowerCase() === brandSlug?.toLowerCase();
    })
    .filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    .filter((p) => {
      if (selectedRatings.length === 0) return true;
      return selectedRatings.some((rating) => p.rating >= rating);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        default: return b.reviews - a.reviews;
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
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {brandInfo?.imageUrl && (
                <div className="w-32 h-32 bg-gray-50 rounded-2xl p-4 flex items-center justify-center border border-gray-100 shadow-sm">
                    <img src={brandInfo.imageUrl.startsWith('/') ? `https://gts-api.slpro.in${brandInfo.imageUrl}` : brandInfo.imageUrl} alt={brandName} className="max-w-full max-h-full object-contain" />
                </div>
            )}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 justify-center md:justify-start">
                <Link to="/" className="hover:text-indigo-600">Home</Link>
                <span>/</span>
                <span className="text-gray-900 font-semibold">{brandName}</span>
              </div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">{brandName}</h1>
              <p className="text-gray-600 mt-2 max-w-2xl">{brandInfo?.description || `Explore the latest products from ${brandName}`}</p>
              <p className="text-sm text-gray-500 mt-2 font-medium">
                {filteredProducts.length} Products Available
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className={`w-64 flex-shrink-0 space-y-6 ${showFilters ? "block" : "hidden md:block"}`}>
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
              <h3 className="mb-4 font-semibold text-lg">Price Range</h3>
              <input type="range" min="0" max="500000" step="1000" value={priceRange[1]} onChange={(e) => setPriceRange([0, parseInt(e.target.value)])} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <div className="flex items-center justify-between mt-2 text-sm text-gray-600 font-medium">
                <span>₹0</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
              <h3 className="mb-4 font-semibold text-lg">Customer Ratings</h3>
              <div className="space-y-2">
                {[4.5, 4, 3.5, 3].map((rating) => (
                  <label key={rating} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={selectedRatings.includes(rating)} onChange={() => toggleRating(rating)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition">{rating}★ & above</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="bg-white rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["popularity", "price-low", "price-high", "rating"].map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)} className={`px-4 py-2 text-sm rounded-xl font-semibold transition whitespace-nowrap ${sortBy === opt ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {opt.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-bold"><SlidersHorizontal size={16}/> Filters</button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-20 text-center shadow-xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6"><SlidersHorizontal className="text-gray-300" size={40}/></div>
                <p className="text-gray-900 text-2xl font-bold mb-2">No products found</p>
                <p className="text-gray-500 mb-8">Try adjusting your filters to find what you're looking for.</p>
                <button onClick={() => { setPriceRange([0, 500000]); setSelectedRatings([]); }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
