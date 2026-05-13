import { useParams, Link } from "react-router";
import { SlidersHorizontal, ChevronDown, LayoutGrid } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import type { Product } from '../types';
import { formatPrice } from '../../lib/formatPrice';

const fetchProducts = async (brand?: string) => {
  // We pass brand query param for efficient backend retrieval
  const url = brand ? `/products?brand=${encodeURIComponent(brand)}&size=100` : '/products?size=100';
  const res = await apiClient.get(url);
  return (res.data.content || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
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

const fetchCategories = async () => {
  try {
    const res = await apiClient.get('/categories');
    return res.data || [];
  } catch {
    return [];
  }
};

export function BrandPage() {
  const { brand: brandSlug } = useParams<{ brand: string }>();
  const [sortBy, setSortBy] = useState("popularity");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: brandInfo, isLoading: brandLoading } = useQuery({
    queryKey: ['brand', brandSlug],
    queryFn: () => fetchBrandInfo(brandSlug || ''),
    enabled: !!brandSlug
  });

  const brandNameQuery = brandInfo?.name || brandSlug;

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products-brand', brandNameQuery],
    queryFn: () => fetchProducts(brandNameQuery),
    enabled: !!brandNameQuery
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  if (brandLoading || productsLoading) return <div className="p-16 text-center text-xl animate-pulse text-slate-600">Acquiring Catalog Data...</div>;

  const brandName = brandInfo?.name || brandSlug || 'Brand';

  const filteredProducts = products
    .filter((p) => {
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

  // Grouping mechanism - Group by category
  const groupedProducts: Record<string, Product[]> = {};
  
  filteredProducts.forEach(product => {
    // Find actual category name from IDs mapping
    const catObj = categories.find(c => c.id === product.category || c.slug === product.category);
    const groupName = catObj ? catObj.name : 'Uncategorized Essentials';
    
    if (!groupedProducts[groupName]) {
      groupedProducts[groupName] = [];
    }
    groupedProducts[groupName].push(product);
  });

  const groupNames = Object.keys(groupedProducts).sort();

  const toggleRating = (rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-12">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 relative overflow-hidden shadow-2xs">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
        <div className="max-w-screen-xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {brandInfo?.imageUrl && (
                <div className="w-36 h-36 bg-white rounded-3xl p-5 flex items-center justify-center border border-slate-200 shadow-md">
                    <img src={brandInfo.imageUrl.startsWith('/') ? `https://gts-api.slpro.in${brandInfo.imageUrl}` : brandInfo.imageUrl} alt={brandName} className="max-w-full max-h-full object-contain scale-105 transition duration-300" />
                </div>
            )}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2 justify-center md:justify-start">
                <Link to="/" className="hover:text-indigo-600">Home</Link>
                <span>/</span>
                <span className="text-slate-600">{brandName} Collection</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-3">{brandName}</h1>
              <p className="text-slate-600 font-medium text-lg max-w-2xl leading-relaxed">{brandInfo?.description || `Discover official products and hardware manufactured by ${brandName}.`}</p>
              <div className="flex items-center gap-3 mt-4 justify-center md:justify-start flex-wrap">
                <span className="bg-indigo-50 text-indigo-700 font-extrabold text-sm px-4 py-1.5 rounded-full border border-indigo-100">{filteredProducts.length} Total Items</span>
                <span className="bg-slate-100 text-slate-600 font-bold text-sm px-4 py-1.5 rounded-full border border-slate-200">{groupNames.length} Categories</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Filter Drawer/Sidebar */}
          <aside className={`w-full lg:w-72 flex-shrink-0 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider mb-5">Refine By Price</h3>
              <input type="range" min="0" max="500000" step="1000" value={priceRange[1]} onChange={(e) => setPriceRange([0, parseInt(e.target.value)])} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <div className="flex items-center justify-between mt-3 text-sm font-extrabold text-slate-700">
                <span className="text-slate-400">₹0</span>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider mb-5">User Reviews</h3>
              <div className="space-y-3">
                {[4.5, 4, 3.5, 3].map((rating) => (
                  <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedRatings.includes(rating)} onChange={() => toggleRating(rating)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition">{rating} ★ & above</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fast Navigation Anchors */}
            {groupNames.length > 1 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider mb-5">Jump To Sector</h3>
                <div className="flex flex-col gap-2">
                  {groupNames.map(name => (
                    <a 
                      key={name} 
                      href={`#category-${name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50/60 px-3 py-2 rounded-xl transition flex justify-between items-center"
                    >
                      <span>{name}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{groupedProducts[name].length}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="flex-1 space-y-8">
            {/* Action Controller */}
            <div className="bg-white rounded-3xl p-4 flex items-center justify-between shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["popularity", "price-low", "price-high", "rating"].map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)} className={`px-5 py-2.5 text-xs uppercase tracking-wider rounded-2xl font-extrabold transition whitespace-nowrap ${sortBy === opt ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                    {opt.replace('-', ' ')}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs uppercase tracking-wider font-extrabold"><SlidersHorizontal size={14}/> Filters</button>
            </div>

            {/* Catalog Groups Rendering */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-4xl p-20 text-center border border-slate-200 shadow-2xs flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center mb-6 shadow-2xs text-slate-300"><SlidersHorizontal size={36}/></div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">No inventory found</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-sm">Adjust parameters or broaden your spectrum to inspect products.</p>
                <button onClick={() => { setPriceRange([0, 500000]); setSelectedRatings([]); }} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-extrabold hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">Reset Constraints</button>
              </div>
            ) : (
              <div className="space-y-10">
                {groupNames.map((groupName) => (
                  <section 
                    key={groupName} 
                    id={`category-${groupName.toLowerCase().replace(/\s+/g, '-')}`}
                    className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6"
                  >
                    {/* Group Title Banner */}
                    <header className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-50 p-2 rounded-xl text-indigo-600 border border-slate-200">
                          <LayoutGrid size={20} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">{groupName}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sector Catalog</p>
                        </div>
                      </div>
                      <span className="text-sm bg-slate-100 text-slate-600 font-black px-4 py-1.5 rounded-full border border-slate-200">
                        {groupedProducts[groupName].length} Matches
                      </span>
                    </header>
                    
                    {/* Grid Flow */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {groupedProducts[groupName].map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
