import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import type { Product } from '../types';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  icon?: string;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  description?: string;
}

const getImageUrl = (url: string | undefined): string => {
    if (!url) return "https://images.unsplash.com/photo-1472851294608-062f824d296e?auto=format&fit=crop&q=60&w=300";
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

const fetchProducts = async () => {
  const res = await apiClient.get('products');
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
      slug: p.slug,
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

const fetchActiveBanners = async () => {
  try {
    const res = await apiClient.get('banners/active');
    return res.data;
  } catch (err) {
    console.error('Failed to fetch banners', err);
    return [];
  }
};

const fetchCategories = async () => {
  const res = await apiClient.get('categories');
  return res.data || [];
};

const fetchBrands = async () => {
  const res = await apiClient.get('brands');
  return res.data || [];
};

export function Home() {
  const [currentBanner, setCurrentBanner] = useState(0);

  const { data: banners = [] } = useQuery({
    queryKey: ['banners', 'active'],
    queryFn: fetchActiveBanners
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const { data: systemCategories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const { data: systemBrands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: fetchBrands
  });

  const nextBanner = () => {
    if (banners.length === 0) return;
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    if (banners.length === 0) return;
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const bannerBg = "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500";
  const defaultBanner = {
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200",
    linkUrl: "/category/all",
    headline: "GT Store Specials",
    description: "Premium Products, Best Prices",
    discount: "Upto 50% Off",
    bg: bannerBg,
  };

  const activeBanners = banners.length > 0 ? banners : [defaultBanner];

  const trendingProducts = products.slice(0, 6);
  // Just arbitrary filters for deals since we don't have discount natively
  const bestDeals = products.slice(0, 6);
  const topRated = products.filter(p => p.rating > 0).length > 0
    ? products.filter(p => p.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 6)
    : products.slice(0, 6);

  return (
    <div>
      {/* Hero Banner Carousel */}
      <section className="relative bg-gray-900 overflow-hidden">
        <div className="max-w-screen-xl mx-auto">
          <div className="relative h-[400px] md:h-[450px]">
            {activeBanners.map((banner: any, index: number) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${index === currentBanner ? "opacity-100" : "opacity-0"
                  }`}
              >
                <div className={`${banner.bg || bannerBg} h-full flex items-center`}>
                  <div className="max-w-screen-xl mx-auto px-4 w-full">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                      <div className="text-white space-y-6">
                        {banner.discount && (
                          <div className="inline-block bg-gradient-to-r from-amber-400 to-yellow-300 text-gray-900 px-5 py-2 rounded-full text-sm font-bold shadow-lg">
                            {banner.discount}
                          </div>
                        )}
                        <h1 className="text-5xl md:text-7xl font-bold leading-tight">{banner.headline || 'Special Offer'}</h1>
                        <p className="text-2xl text-white/90">{banner.description || `Shop our latest collections`}</p>
                        <Link
                          to={banner.linkUrl || "/category/all"}
                          className="inline-block bg-white text-indigo-600 px-10 py-4 rounded-2xl hover:bg-gray-100 transition transform hover:scale-105 shadow-2xl font-semibold"
                        >
                          Shop Now
                        </Link>
                      </div>
                      <div className="hidden md:block">
                        <img
                          src={banner.imageUrl.startsWith('/') ? `https://gts-api.slpro.in${banner.imageUrl}` : banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-[350px] object-cover rounded-3xl shadow-2xl ring-4 ring-white/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activeBanners.length > 1 && (
              <>
                <button
                  onClick={prevBanner}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2 rounded-full transition"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={nextBanner}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2 rounded-full transition"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {activeBanners.map((_: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBanner(index)}
                      className={`w-2 h-2 rounded-full transition-all ${index === currentBanner ? "bg-white w-8" : "bg-white/50"
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
             <span>Shop by Category</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-6">
            {systemCategories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug || category.id}`}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-200 bg-white group-hover:border-indigo-500 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 flex items-center justify-center relative">
                  {category.imageUrl ? (
                    <img
                      src={getImageUrl(category.imageUrl)}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                     <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-2xl font-extrabold text-indigo-600 select-none">
                       {category.name.slice(0, 2).toUpperCase()}
                     </div>
                  )}
                </div>
                <span className="text-xs text-center font-bold text-gray-700 group-hover:text-indigo-600 transition">
                  {category.name}
                </span>
              </Link>
            ))}
            {systemCategories.length === 0 && (
               <div className="col-span-full py-12 text-center text-gray-400 font-semibold italic">
                  Synchronizing Category matrices...
               </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 py-5">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">Shop by Brand</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-6">
            {systemBrands.map((brand) => (
              <Link
                key={brand.id}
                to={`/brand/${brand.slug || brand.id}`}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-gradient-to-br hover:from-pink-50 hover:to-purple-50 transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-200 bg-white group-hover:border-pink-500 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 flex items-center justify-center p-3">
                  {brand.imageUrl ? (
                    <img
                      src={getImageUrl(brand.imageUrl)}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-extrabold text-pink-500 select-none">{brand.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs text-center font-bold text-gray-700 group-hover:text-pink-600 transition">
                  {brand.name}
                </span>
              </Link>
            ))}
            {systemBrands.length === 0 && (
               <div className="col-span-full py-12 text-center text-gray-400 font-semibold italic">
                  Synchronizing Brand matrices...
               </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-3xl shadow-xl p-8 border border-indigo-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Best Deals</h2>
              <p className="text-sm text-gray-600 mt-1">Up to 40% off on selected items</p>
            </div>
            <Link
              to="/category/deals"
              className="text-indigo-600 hover:text-purple-600 font-semibold text-sm flex items-center gap-1 group"
            >
              View All
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {bestDeals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-3xl shadow-xl p-8 border border-purple-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Trending Now</h2>
              <p className="text-sm text-gray-600 mt-1">Most popular products this week</p>
            </div>
            <Link
              to="/category/trending"
              className="text-purple-600 hover:text-pink-600 font-semibold text-sm flex items-center gap-1 group"
            >
              View All
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-br from-white to-amber-50/50 rounded-3xl shadow-xl p-8 border border-amber-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Top Rated Products</h2>
              <p className="text-sm text-gray-600 mt-1">Highly rated by customers</p>
            </div>
            <Link
              to="/category/top-rated"
              className="text-amber-600 hover:text-orange-600 font-semibold text-sm flex items-center gap-1 group"
            >
              View All
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {topRated.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
