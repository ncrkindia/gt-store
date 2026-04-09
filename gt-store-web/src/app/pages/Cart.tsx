import { Link } from "react-router";
import { Trash2, Plus, Minus, ShoppingBag, Tag } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { PayPalButtons } from '@paypal/react-paypal-js';
import type { Product } from '../types';

const fetchCart = async () => {
  const res = await apiClient.get('/cart');
  return res.data;
};

const fetchProductsBulk = async (ids: string[]) => {
  if (!ids || ids.length === 0) return [];
  const res = await apiClient.post('/products/bulk', ids);
  // Map API response to Theme's Product format
  return (res.data || []).map((p: any) => ({
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

export function Cart() {
  const [promoCode, setPromoCode] = useState("");
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();

  const { data: cart, isLoading: isCartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!keycloak.authenticated
  });

  const cartItems = cart?.items || [];
  const productIds = cartItems.map((item: any) => item.productId);

  const { data: products, isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ['products-bulk', productIds],
    queryFn: () => fetchProductsBulk(productIds),
    enabled: productIds.length > 0
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, delta }: { productId: string, delta: number }) =>
      apiClient.post('/cart/items', { productId, quantity: delta }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/cart/items/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const handleCreatePayPalOrder = async () => {
    try {
      const itemsWithPrice = cart.items.map((i: any) => {
        const p = products?.find((prod) => prod.id === i.productId);
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: p?.price || 0
        };
      });

      const orderRes = await apiClient.post('/orders', {
        shippingAddressId: 1,
        items: itemsWithPrice
      });

      const orderId = orderRes.data.id;
      const paypalRes = await apiClient.post(`/payments/paypal/create/${orderId}`);
      return paypalRes.data.paypalOrderId;
    } catch (error: any) {
      alert('Failed to initiate checkout: ' + (error.response?.data || error.message));
      throw error;
    }
  };

  const handleOnApprove = async (data: any) => {
    try {
      await apiClient.post(`/payments/paypal/capture/${data.orderID}`);
      await apiClient.delete('/cart');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      alert('Payment Successful! Order Placed.');
    } catch (error: any) {
      alert('Payment verification failed: ' + (error.response?.data || error.message));
    }
  };

  if (!keycloak.authenticated) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Please Login to view your Cart</h2>
        <button 
          onClick={() => keycloak.login()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-lg hover:bg-indigo-700 cursor-pointer"
        >
          Login
        </button>
      </div>
    );
  }

  if (isCartLoading || (productIds.length > 0 && isProductsLoading)) {
    return <div className="max-w-screen-xl mx-auto px-4 py-16 text-center text-xl">Loading your cart...</div>;
  }

  const enrichedItems = cartItems.map((item: any) => {
    const product = products?.find((p) => p.id === item.productId);
    return {
      ...item,
      product: product || {
        id: item.productId,
        name: 'Loading...',
        price: 0,
        image: ''
      }
    };
  });

  const subtotal = enrichedItems.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0);
  const discount = 0;
  const shipping = subtotal > 0 && subtotal <= 50 ? 10 : 0;
  const total = subtotal - discount + shipping;

  if (enrichedItems.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-16 text-center shadow-xl">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add items to get started</p>
          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold shadow-lg"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 min-h-screen py-8">
      <div className="max-w-screen-xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Shopping Cart ({enrichedItems.length} items)</h1>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            {enrichedItems.map((item: any) => (
              <div key={item.productId} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border border-gray-100">
                <div className="flex gap-4">
                  <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                    <img
                      src={item.product.image || 'https://via.placeholder.com/150'}
                      alt={item.product.name}
                      className="w-32 h-32 object-cover rounded border border-gray-200"
                    />
                  </Link>

                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <Link
                        to={`/product/${item.productId}`}
                        className="text-lg font-semibold hover:text-indigo-600 transition"
                      >
                        {item.product.name}
                      </Link>
                      <button
                        onClick={() => removeMutation.mutate(item.productId)}
                        className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{item.product.brand}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl">${item.product.price}</span>
                      </div>

                      <div className="flex items-center gap-3 border-2 border-gray-300 rounded-xl">
                        <button
                          onClick={() => updateQuantityMutation.mutate({ productId: item.productId, delta: -1 })}
                          className="px-4 py-2 hover:bg-indigo-50 transition cursor-pointer"
                          disabled={updateQuantityMutation.isPending}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantityMutation.mutate({ productId: item.productId, delta: 1 })}
                          className="px-4 py-2 hover:bg-indigo-50 transition cursor-pointer"
                          disabled={updateQuantityMutation.isPending}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-2xl p-6 shadow-lg border border-purple-100">
              <h3 className="text-xl font-bold mb-6">Price Details</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal ({enrichedItems.length} items)
                  </span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Add ${(50 - subtotal).toFixed(2)} more for FREE shipping
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6 mb-8">
                <div className="flex justify-between text-xl">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-2xl text-indigo-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <PayPalButtons 
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "checkout" }}
                createOrder={handleCreatePayPalOrder}
                onApprove={handleOnApprove}
              />

              <Link
                to="/"
                className="block text-center text-indigo-600 hover:text-purple-600 font-semibold text-sm mt-4"
              >
                Continue Shopping
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 text-sm text-gray-700 mb-3">
                <span className="text-emerald-600 text-lg">✓</span>
                <span>Safe and Secure Payments</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 mb-3">
                <span className="text-emerald-600 text-lg">✓</span>
                <span>100% Payment Protection</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <span className="text-emerald-600 text-lg">✓</span>
                <span>Easy Returns & Refunds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
