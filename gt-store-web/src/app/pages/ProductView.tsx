import { useParams, Link } from "react-router";
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import type { Product } from '../types';

const fetchProducts = async () => {
  const res = await apiClient.get('/products');
  return (res.data.content || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || p.name,
    price: p.price,
    rating: p.rating || 0,
    reviews: p.reviewCount || 0,
    image: (p.images && p.images.length > 0) ? p.images[0] : '',
    images: p.images || [],
    brand: p.brand || 'Generic',
    category: p.category || 'all',
    inStock: true,
    features: []
  }));
};

export function ProductView() {
  const { id } = useParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { keycloak } = useKeycloak();

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const product = products.find((p) => p.id === id);

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
    .filter((p) => p.rating >= 4.0 && p.id !== product.id)
    .slice(0, 6);

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
      alert('Added to cart!');
    } catch (err) {
      console.error(err);
      alert('Failed to add to cart.');
    }
  };

  return (
    <div>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-[#2874f0]">Home</Link>
            <span>/</span>
            <Link to={`/category/${product.category}`} className="hover:text-[#2874f0] capitalize">
              {product.category}
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

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded">
                  <span>{product.rating}</span>
                  <Star className="w-4 h-4 fill-white" />
                </div>
                <span className="text-gray-600">
                  {product.reviews.toLocaleString()} ratings & reviews
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl text-gray-900">${product.price}</span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ${product.originalPrice}
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

              <button className="flex items-center gap-2 text-gray-700 hover:text-[#2874f0] transition mb-6 cursor-pointer">
                <Heart className="w-5 h-5" />
                Add to Wishlist
              </button>

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
                <div className="flex border-b border-gray-100 pb-2">
                  <span className="w-32 text-gray-600">Brand</span>
                  <span className="text-gray-900">{product.brand}</span>
                </div>
                <div className="flex border-b border-gray-100 pb-2">
                  <span className="w-32 text-gray-600">Category</span>
                  <span className="text-gray-900 capitalize">{product.category}</span>
                </div>
                <div className="flex border-b border-gray-100 pb-2">
                  <span className="w-32 text-gray-600">In Stock</span>
                  <span className="text-gray-900">{product.inStock ? "Yes" : "No"}</span>
                </div>
              </div>
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
    </div>
  );
}
