import { useParams, Link } from "react-router";
import { SlidersHorizontal, Grid3X3, LayoutGrid } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import type { Product } from '../types';
import { formatPrice } from '../../lib/formatPrice';

const fetchCategoryInfo = async (slug: string) => {
  if (!slug || slug === 'all') return null;
  try {
    const res = await apiClient.get(`/categories/slug/${slug}`);
    return res.data;
  } catch (err) {
    return null;
  }
};

const fetchProducts = async (categoryId?: string) => {
  // Build robust endpoint using categoryId filter or fetching all if unspecified
  const url = categoryId && categoryId !== 'all' 
    ? `/products?categoryId=${encodeURIComponent(categoryId)}&size=100` 
    : '/products?size=100';
  
  const res = await apiClient.get(url);
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
      categoryIds: p.categoryIds || [],
      inStock: p.inStock !== undefined ? p.inStock : true,
      features: p.features || []
    };
  });
};

export function CategoryPage() {
  const { category: categorySlug } = useParams<{ category: string }>();
  const [sortBy, setSortBy] = useState("popularity");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [enableGrouping, setEnableGrouping] = useState(false);

  // 1. Fetch current category details via Slug
  const { data: categoryInfo, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-info', categorySlug],
    queryFn: () => fetchCategoryInfo(categorySlug || ''),
    enabled: !!categorySlug
  });

  // Determine search parameter (ID or Slug depending on match)
  const activeCategoryId = categoryInfo?.id || categorySlug;

  // 2. Fetch products filtered by Category
  const { data: products = [], isLoading: productsLoading, error } = useQuery<Product[]>({
    queryKey: ['products-category', activeCategoryId],
    queryFn: () => fetchProducts(activeCategoryId),
    enabled: !!activeCategoryId
  });

  if (categoryLoading || productsLoading) return <div className="p-16 text-center text-xl animate-pulse text-slate-600 font-medium">Cataloging category archive...</div>;
  if (error) return <div className="p-16 text-center text-xl text-rose-600 font-bold">Dynamic mapping failed. Retry catalog query.</div>;

  const categoryName = categoryInfo?.name || categorySlug || 'Catalog';

  const filteredProducts = products
    .filter((p) => {
      if (categorySlug && categorySlug !== "all" && categorySlug !== "deals" && categorySlug !== "trending" && categorySlug !== "top-rated") {
        // If we have robust Category IDs from database, check all tagged category IDs/slugs
        if (categoryInfo) {
            const idMatch = p.categoryIds?.some(cid => cid.toLowerCase() === categoryInfo.id.toLowerCase());
            const slugMatch = p.categoryIds?.some(cid => cid.toLowerCase() === categoryInfo.slug.toLowerCase());
            return idMatch || slugMatch || 
                   p.category?.toLowerCase() === categoryInfo.id.toLowerCase() || 
                   p.category?.toLowerCase() === categoryInfo.slug.toLowerCase();
        }
        const slugMatch = p.categoryIds?.some(cid => cid.toLowerCase() === categorySlug.toLowerCase());
        return slugMatch || p.category?.toLowerCase() === categorySlug.toLowerCase();
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
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        default: return b.reviews - a.reviews;
      }
    });

  // Extract unique brands for conditional grouping
  const availableBrands = Array.from(new Set(filteredProducts.map(p => p.brand))).sort();
  const hasMultipleBrands = availableBrands.length > 1;

  // Perform actual brand grouping
  const groupedProducts: Record<string, Product[]> = {};
  filteredProducts.forEach(product => {
    const brandName = product.brand || 'Generic Brands';
    if (!groupedProducts[brandName]) {
      groupedProducts[brandName] = [];
    }
    groupedProducts[brandName].push(product);
  });

  const toggleRating = (rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-12">
      {/* Dynamic Header */}
      <div className="bg-white border-b border-slate-200 overflow-hidden relative shadow-2xs">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
        <div className="max-w-screen-xl mx-auto px-4 py-10">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2 justify-center md:justify-start">
                <Link to="/" className="hover:text-indigo-600">Home</Link>
                <span>/</span>
                <span className="text-slate-600 font-bold">Categories</span>
                <span>/</span>
                <span className="text-slate-900 font-bold capitalize">{categorySlug}</span>
              </div>
              <h1 className="text-5xl font-black text-slate-900 capitalize tracking-tight mb-3 flex items-center gap-3 justify-center md:justify-start">
                {categoryInfo?.icon && (
                    <span className="text-4xl">{categoryInfo.icon}</span>
                )}
                {categoryName}
              </h1>
              <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">
                Browsing all verified hardware inventory indexed within the <span className="text-slate-800 font-bold">{categoryName}</span> classification.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-sm px-5 py-2 rounded-full">{filteredProducts.length} Dynamic Items</span>
                <span className="bg-slate-50 border border-slate-200 text-slate-600 font-extrabold text-sm px-5 py-2 rounded-full">{availableBrands.length} Allied Brands</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className={`w-full lg:w-72 flex-shrink-0 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider mb-5">Budget Tier</h3>
              <input type="range" min="0" max="500000" step="1000" value={priceRange[1]} onChange={(e) => setPriceRange([0, parseInt(e.target.value)])} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <div className="flex items-center justify-between mt-3 text-sm font-extrabold text-slate-700">
                <span className="text-slate-400">₹0</span>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider mb-5">Appraisal</h3>
              <div className="space-y-3">
                {[4.5, 4, 3.5, 3].map((rating) => (
                  <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedRatings.includes(rating)} onChange={() => toggleRating(rating)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition">{rating}★ & above</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Jump Menu if Grouping enabled */}
            {enableGrouping && hasMultipleBrands && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider mb-5">Partner Ecosystem</h3>
                <div className="flex flex-col gap-2">
                  {availableBrands.map(brand => (
                    <a 
                      key={brand} 
                      href={`#brand-${brand.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50/60 px-3 py-2 rounded-xl transition flex justify-between items-center"
                    >
                      <span>{brand}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{groupedProducts[brand].length}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="flex-1 space-y-6">
            {/* Sort & Grouping Panel */}
            <div className="bg-white rounded-3xl p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                {["popularity", "price-low", "price-high", "rating"].map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)} className={`px-5 py-2.5 text-xs uppercase tracking-wider rounded-2xl font-extrabold transition whitespace-nowrap ${sortBy === opt ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                    {opt.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 justify-between md:justify-end">
                {/* Option of Grouping by Brand Toggle */}
                {hasMultipleBrands && (
                  <button 
                    onClick={() => setEnableGrouping(!enableGrouping)} 
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider font-black transition cursor-pointer ${enableGrouping ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
                  >
                    {enableGrouping ? <LayoutGrid size={14}/> : <Grid3X3 size={14}/>}
                    {enableGrouping ? "Structured by Brand" : "Standard Matrix"}
                  </button>
                )}
                
                <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs uppercase tracking-wider font-extrabold cursor-pointer"><SlidersHorizontal size={14}/> Filters</button>
              </div>
            </div>

            {/* Products Content */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-4xl p-20 text-center border border-slate-200 shadow-2xs flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center mb-6 shadow-2xs text-slate-300"><SlidersHorizontal size={36}/></div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Category inventory vacant</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-sm">Modify parameters or visit another terminal sector.</p>
                <button onClick={() => { setPriceRange([0, 500000]); setSelectedRatings([]); }} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-extrabold hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">Reboot Thresholds</button>
              </div>
            ) : enableGrouping && hasMultipleBrands ? (
              // GROUPED STATE
              <div className="space-y-10 mt-4">
                {availableBrands.map((brandName) => (
                  <section 
                    key={brandName} 
                    id={`brand-${brandName.toLowerCase().replace(/\s+/g, '-')}`}
                    className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6"
                  >
                    <header className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-50 p-2 rounded-xl text-indigo-600 border border-slate-200 font-black tracking-wide text-xs select-none">
                          MD
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">{brandName}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ecosystem Lineup</p>
                        </div>
                      </div>
                      <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 font-black px-4 py-1.5 rounded-full">
                        {groupedProducts[brandName].length} SKUs
                      </span>
                    </header>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {groupedProducts[brandName].map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              // STANDARD GRID STATE
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4 animate-fadeIn">
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
