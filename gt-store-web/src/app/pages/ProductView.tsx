import { useParams, Link } from "react-router";
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, X, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import type { Product } from '../types';
import { formatPrice } from '../../lib/formatPrice';
import { toast } from 'sonner';

const API_BASE = 'https://gts-api.slpro.in';
const resolveImg = (img?: string): string => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const cleanPath = img.startsWith('/') ? img : '/' + img;
  if (cleanPath.startsWith('/api/media/files/')) {
    return `${API_BASE}${cleanPath}`;
  }
  return `${API_BASE}/api/media/files/${img}`;
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

const fetchCategories = async () => {
  const res = await apiClient.get('/categories');
  return res.data || [];
};

const fetchBrands = async () => {
  const res = await apiClient.get('/brands');
  return res.data || [];
};

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
      slug: p.slug,
      name: p.name,
      description: p.description || p.name,
      price: price,
      originalPrice: originalPrice,
      discount: discount,
      rating: p.rating || 0,
      reviews: p.reviewCount || 0,
      image: (p.images && p.images.length > 0) ? resolveImg(p.images[0]) : '',
      images: (p.images || []).map(resolveImg),
      brand: p.brand || 'Generic',
      category: (p.categoryIds && p.categoryIds.length > 0) ? p.categoryIds[0] : 'all',
      categoryIds: p.categoryIds || [],
      inStock: p.inStock !== undefined ? p.inStock : true,
      features: p.features || [],
      ratingBreakdown: p.ratingBreakdown || {},
      reviewsList: p.reviews || []
    };
  });
};

export function ProductView() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [sortOption, setSortOption] = useState("newest");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const openLightbox = (images: string[], idx: number) => {
    setLightboxImages(images);
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  const nextLightbox = () => {
    setLightboxIdx((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevLightbox = () => {
    setLightboxIdx((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };
  const { keycloak } = useKeycloak();

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: fetchBrands
  });

  const { data: wishlist = [], refetch: refetchWishlist } = useQuery<any[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await apiClient.get('/users/me/wishlist');
      return res.data || [];
    },
    enabled: !!keycloak.authenticated
  });

  const product = products.find((p) => (id && p.id === id) || (slug && p.slug === slug));

  const isWishlisted = wishlist.some((item: any) => item.productId === product?.id);

  if (isLoading) {
    return <div className="max-w-screen-xl mx-auto px-4 py-16 text-center text-xl">Loading product...</div>;
  }

  if (error || !product) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl mb-4">Product not found</h2>
        <Link to="/" className="text-[#2874f0] hover:underline">
          Go back to home
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [product.image];

  const similarProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 6);

  const suggestedProducts = products
    .filter((p) => p.id !== product.id)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  // Match the brand object by name and resolve dynamic storefront target URL
  const matchedBrand = brands.find((b) => b.name.toLowerCase() === product.brand.toLowerCase());
  const brandHref = matchedBrand ? `/brand/${matchedBrand.slug || matchedBrand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `#`;

  // Map category references to resolved names and route slugs
  const resolvedCategories = (product.categoryIds || []).map((ref) => {
    const cat = categories.find((c) => c.id === ref || c.slug === ref);
    return cat 
      ? { name: cat.name, href: `/category/${cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` } 
      : { name: ref, href: `/category/${ref}` };
  });

  let finalCategories = resolvedCategories;
  if (finalCategories.length === 0) {
    const fallbackCat = categories.find((c) => c.id === product.category || c.slug === product.category);
    finalCategories = [
      fallbackCat 
        ? { name: fallbackCat.name, href: `/category/${fallbackCat.slug || fallbackCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` } 
        : { name: product.category, href: `/category/${product.category}` }
    ];
  }

  const handleToggleWishlist = async () => {
    if (!keycloak.authenticated) {
      keycloak.login();
      return;
    }
    try {
      if (isWishlisted) {
        await apiClient.delete(`/users/me/wishlist/${product.id}`);
        toast.success('Removed from wishlist!');
      } else {
        await apiClient.post('/users/me/wishlist', { productId: product.id });
        toast.success('Added to wishlist!');
      }
      refetchWishlist();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update wishlist.');
    }
  };

  const handleAddToCart = async () => {
    if (!keycloak.authenticated) {
      keycloak.login();
      return;
    }
    try {
      await apiClient.post('/cart/items', {
        productId: product.id,
        quantity: quantity
      });
      toast.success('Added to cart!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to cart.');
    }
  };

  return (
    <div>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-[#2874f0]">Home</Link>
            <span>/</span>
            <Link to={finalCategories.length > 0 ? finalCategories[0].href : `/category/${product.category}`} className="hover:text-[#2874f0] capitalize">
              {finalCategories.length > 0 ? finalCategories[0].name : product.category}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="sticky top-24">
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img
                    src={images[selectedImage] || product.image || ''}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2 relative z-10 w-full overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                        selectedImage === index ? "border-[#2874f0]" : "border-gray-200"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 bg-[#ff9f00] text-white py-3 rounded hover:bg-[#e88f00] transition cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button 
                  onClick={() => {
                    handleAddToCart().then(() => {
                      if (keycloak.authenticated) window.location.href = '/cart';
                    });
                  }}
                  className="flex items-center justify-center gap-2 bg-[#fb641b] text-white py-3 rounded hover:bg-[#e85408] transition cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy Now
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6">
              <h1 className="text-2xl text-gray-900 mb-2">{product.name}</h1>
              <p className="text-sm text-gray-600 mb-4">{product.brand}</p>

              {product.rating > 0 ? (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded">
                  <span>{product.rating.toFixed(1)}</span>
                  <Star className="w-4 h-4 fill-white" />
                </div>
                <span className="text-gray-600">
                  {product.reviews.toLocaleString()} ratings & reviews
                </span>
              </div>
              ) : (
              <p className="text-sm text-gray-400 mb-6">No reviews yet</p>
              )}

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl text-gray-900">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="text-lg text-green-600">{product.discount}% off</span>
                  </>
                )}
              </div>

              <div className="mb-6">
                <label className="text-sm text-gray-700 mb-2 block">Quantity:</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded hover:bg-gray-50 transition"
                  >
                    -
                  </button>
                  <span className="text-lg w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-gray-300 rounded hover:bg-gray-50 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleToggleWishlist}
                  className="flex items-center gap-2 text-gray-700 hover:text-rose-600 transition cursor-pointer"
                >
                  <Heart className={`w-5 h-5 transition-transform duration-300 hover:scale-110 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-700'}`} />
                  {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                </button>
                <button 
                  onClick={() => {
                    const shareUrl = window.location.origin + "/p/" + (product.slug || product.id);
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Product link copied to clipboard!');
                  }}
                  className="flex items-center gap-2 text-gray-700 hover:text-[#2874f0] transition cursor-pointer"
                >
                  <Share2 className="w-5 h-5" />
                  Share Product
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm">
                      <strong>Free Delivery</strong> on orders over $50
                    </p>
                    <p className="text-xs text-gray-500">Delivery by 10 Apr, Monday</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm">
                      <strong>30 Days Return Policy</strong>
                    </p>
                    <p className="text-xs text-gray-500">Easy returns and refunds</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm">
                      <strong>Secure Transaction</strong>
                    </p>
                    <p className="text-xs text-gray-500">100% secure payment</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl mb-4">Product Description</h2>
              <p className="text-gray-700 mb-4">{product.description}</p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl mb-4">Specifications</h2>
              <div className="space-y-3 text-sm">
                <div className="flex border-b border-gray-100 pb-2 items-center">
                  <span className="w-32 text-gray-600 font-medium">Brand</span>
                  <span className="text-gray-900 font-semibold">
                    {brandHref !== '#' ? (
                      <a 
                        href={brandHref} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#2874f0] hover:text-blue-800 hover:underline transition"
                      >
                        {product.brand}
                      </a>
                    ) : (
                      product.brand
                    )}
                  </span>
                </div>
                <div className="flex border-b border-gray-100 pb-2 items-center">
                  <span className="w-32 text-gray-600 font-medium">Category</span>
                  <span className="text-gray-900 flex flex-wrap items-center font-semibold">
                    {finalCategories.map((cat, idx) => (
                      <span key={idx} className="flex items-center">
                        <a 
                          href={cat.href} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[#2874f0] hover:text-blue-800 hover:underline transition capitalize"
                        >
                          {cat.name}
                        </a>
                        {idx < finalCategories.length - 1 && <span className="mr-1.5 text-gray-400 font-normal">,</span>}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="flex border-b border-gray-100 pb-2">
                  <span className="w-32 text-gray-600">In Stock</span>
                  <span className="text-gray-900">{product.inStock ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            {product.features && product.features.length > 0 && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl mb-4">Key Features</h2>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  {product.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ratings & Reviews Section */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl">Ratings & Reviews</h2>
                <select 
                  value={sortOption} 
                  onChange={(e) => setSortOption(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="high">Highest Rating</option>
                  <option value="low">Lowest Rating</option>
                </select>
              </div>
              {product.reviews > 0 ? (
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                  {/* Rating Summary */}
                  <div className="flex flex-col items-center justify-center min-w-[150px]">
                      <div className="text-4xl font-light mb-2">{product.rating.toFixed(1)} <Star className="w-8 h-8 inline-block fill-current text-yellow-500 mb-1"/></div>
                      <p className="text-sm text-gray-500 font-medium">{product.reviews.toLocaleString()} Ratings</p>
                  </div>

                  {/* Rating Breakdown Bars */}
                  <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map(stars => {
                          const count = product.ratingBreakdown?.[stars] || 0;
                          const percentage = product.reviews === 0 ? 0 : (count / product.reviews) * 100;
                          return (
                              <div key={stars} className="flex items-center gap-3 text-sm">
                                  <div className="w-12 text-gray-600 flex items-center justify-end">{stars} <Star className="w-3 h-3 ml-1 fill-gray-400 text-gray-400"/></div>
                                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                      <div className={`h-full rounded-full ${stars > 2 ? 'bg-green-500' : stars === 2 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                                  </div>
                                  <div className="w-12 text-gray-500 text-xs">{count}</div>
                              </div>
                          );
                      })}
                  </div>
              </div>
              ) : (
              <p className="text-gray-400 text-sm mb-8">No ratings yet. Be the first to review this product!</p>
              )}

              {/* Review Timeline */}
              {product.reviewsList && product.reviewsList.length > 0 ? (
                  <div className="space-y-6">
                      {product.reviewsList.slice().sort((a, b) => {
                          if (sortOption === "high") return b.rating - a.rating;
                          if (sortOption === "low") return a.rating - b.rating;
                          const dateA = new Date(a.date).getTime();
                          const dateB = new Date(b.date).getTime();
                          if (sortOption === "oldest") return dateA - dateB;
                          return dateB - dateA; // newest
                      }).map((review, idx) => (
                          <div key={idx} className="border-t border-gray-100 pt-6">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className={`flex items-center gap-1 text-white px-2 py-0.5 rounded text-xs font-semibold ${review.rating > 2 ? 'bg-green-600' : review.rating === 2 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                      <span>{review.rating}</span>
                                      <Star className="w-3 h-3 fill-white" />
                                  </div>
                                  <span className="font-medium text-gray-900 border-l pl-2 ml-2 border-gray-300">{review.userName || 'Anonymous'}</span>
                                  <span className="text-sm text-gray-500 ml-auto">{new Date(review.date).toLocaleDateString()}</span>
                              </div>
                              <p className="text-gray-700 mt-2">{review.comment}</p>
                              {review.images && review.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {review.images.map((img, imgIdx) => (
                                    <div key={imgIdx} className="w-16 h-16 border rounded overflow-hidden cursor-pointer hover:opacity-80 transition" onClick={() => openLightbox(review.images || [], imgIdx)}><img src={resolveImg(img)} className="w-full h-full object-cover" alt="Review upload" /></div>
                                  ))}
                                </div>
                              )}
                          </div>
                      ))}
                  </div>
              ) : (
                  <p className="text-gray-500 text-sm text-center">No reviews yet.</p>
              )}
            </div>
          </div>
        </div>

        {similarProducts.length > 0 && (
          <section className="mt-12">
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-2xl mb-6">Similar Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {similarProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {suggestedProducts.length > 0 && (
          <section className="mt-8">
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-2xl mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {suggestedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center">
          <button 
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-black/20 rounded-full p-2"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="relative w-full max-w-4xl flex items-center justify-center px-4">
            {lightboxImages.length > 1 && (
              <button 
                onClick={prevLightbox}
                className="absolute left-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            <img 
              src={resolveImg(lightboxImages[lightboxIdx])} 
              alt="Full view review" 
              className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            />

            {lightboxImages.length > 1 && (
              <button 
                onClick={nextLightbox}
                className="absolute right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>
          
          {lightboxImages.length > 1 && (
            <div className="mt-6 flex gap-2 overflow-x-auto px-4 max-w-full">
              {lightboxImages.map((thumb, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIdx(idx)}
                  className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${idx === lightboxIdx ? 'border-blue-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={resolveImg(thumb)} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
