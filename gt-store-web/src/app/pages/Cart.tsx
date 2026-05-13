import { Link } from "react-router";
import { Trash2, Plus, Minus, ShoppingBag, Tag, MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import type { Product } from '../types';
import { formatPrice } from '../../lib/formatPrice';
import { toast } from 'sonner';

const fetchCart = async () => {
  const res = await apiClient.get('/cart');
  return res.data;
};

const fetchUserProfile = async () => {
  const res = await apiClient.get('/users/me');
  return res.data;
};

const fetchProductsBulk = async (ids: string[]) => {
  if (!ids || ids.length === 0) return [];
  const res = await apiClient.post('/products/bulk', ids);
  return (res.data || []).map((p: any) => {
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

export function Cart() {
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();

  const { data: cart, isLoading: isCartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!keycloak.authenticated
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    enabled: !!keycloak.authenticated
  });

  const addresses = profile?.addresses || [];
  const user = profile?.user || {};

  useEffect(() => {
    if (addresses.length > 0 && selectedAddressId === null) {
      const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses]);

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);

  const cartItems = cart?.items || [];
  const productIds = cartItems.map((item: any) => item.productId);

  const { data: products, isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ['products-bulk', productIds],
    queryFn: () => fetchProductsBulk(productIds),
    enabled: productIds.length > 0
  });

  const enrichedItems = cartItems.map((item: any) => {
    const product = products?.find((p) => p.id === item.productId);
    return {
      ...item,
      product: product || {
        id: item.productId,
        slug: undefined,
        name: 'Loading...',
        price: 0,
        image: ''
      }
    };
  });

  const subtotal = enrichedItems.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0);
  const shipping = subtotal > 0 && subtotal <= 50 ? 10 : 0;
  const total = subtotal + shipping;

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, delta }: { productId: string, delta: number }) =>
      apiClient.post('/cart/items', { productId, quantity: delta }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/cart/items/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const getOrderPayload = (paymentMethod: string) => {
    if (!selectedAddress) {
      toast.error('Please select a shipping address');
      return null;
    }

    const itemsWithPrice = cart.items.map((i: any) => {
      const p = products?.find((prod) => prod.id === i.productId);
      return {
        productId: i.productId,
        quantity: i.quantity,
        price: p?.price || 0
      };
    });

    return {
      shippingAddressId: selectedAddress.id,
      paymentMethod,
      items: itemsWithPrice,
      // Address Snapshot
      shippingLine1: selectedAddress.line1,
      shippingLine2: selectedAddress.line2,
      shippingCity: selectedAddress.city,
      shippingState: selectedAddress.state,
      shippingPincode: selectedAddress.pincode,
      shippingCountry: selectedAddress.country,
      customerName: selectedAddress.name || user.name || user.username || '',
      customerEmail: user.email || '',
      customerPhone: selectedAddress.phone || user.phone || ''
    };
  };

  const handleRazorpayPayment = async () => {
    const payload = getOrderPayload('ONLINE');
    if (!payload) return;

    try {
      // 1. Create Internal Order
      const orderRes = await apiClient.post('/orders', payload);
      const orderId = orderRes.data.id;

      // 2. Create Razorpay Order
      const rzpRes = await apiClient.post(`/payments/razorpay/create/${orderId}`);
      const { razorpayOrderId } = rzpRes.data;

      // 3. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: total * 100,
        currency: 'INR',
        name: 'GT Store',
        description: `Order #${orderId}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            await apiClient.post('/payments/razorpay/verify', {
              ...response,
              orderId
            });
            await apiClient.delete('/cart');
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            toast.success('Payment Successful! Order Placed.');
          } catch (error: any) {
            toast.error('Payment verification failed: ' + (error.response?.data || error.message));
          }
        },
        prefill: {
          name: keycloak.tokenParsed?.name || '',
          email: keycloak.tokenParsed?.email || '',
        },
        theme: {
          color: "#4f46e5"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error('Failed to initiate Razorpay: ' + (error.response?.data || error.message));
    }
  };

  const handleCODPayment = async () => {
    const payload = getOrderPayload('COD');
    if (!payload) return;

    try {
      await apiClient.post('/orders', payload);
      await apiClient.delete('/cart');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Order Placed! Please pay Cash on Delivery.');
    } catch (error: any) {
      toast.error('Failed to place COD order: ' + (error.response?.data || error.message));
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
          <div className="space-y-6">
            {/* Address Selection Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden relative">
               <div className="flex items-center gap-3 mb-6">
                 <div className="bg-indigo-100 p-2 rounded-lg">
                   <MapPin className="w-5 h-5 text-indigo-600" />
                 </div>
                 <h2 className="text-xl font-bold">Delivery Address</h2>
               </div>

               {addresses.length === 0 ? (
                 <div className="text-center py-4">
                   <p className="text-gray-600 mb-4">No addresses saved yet.</p>
                   <Link to="/account/addresses" className="text-indigo-600 font-bold hover:underline">Add Address</Link>
                 </div>
               ) : (
                 <div>
                   {!showAddressSelector ? (
                     <div className="flex justify-between items-start bg-gray-50 p-4 rounded-xl border border-gray-200">
                       <div className="flex-1">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold text-gray-900">{selectedAddress?.name || user.name}</span>
                           {selectedAddress?.isDefault && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Default</span>}
                         </div>
                         <p className="text-gray-600 text-sm">{selectedAddress?.line1}, {selectedAddress?.line2 && selectedAddress.line2 + ', '}{selectedAddress?.city}</p>
                         <p className="text-gray-600 text-sm font-semibold mt-1">{selectedAddress?.state}, {selectedAddress?.pincode}</p>
                         <p className="text-indigo-600 text-sm font-bold mt-2">Contact: {selectedAddress?.phone || user.phone || 'N/A'}</p>
                       </div>
                       <button 
                         onClick={() => setShowAddressSelector(true)}
                         className="text-indigo-600 text-sm font-bold hover:underline flex items-center gap-1 cursor-pointer"
                       >
                         Change <ChevronRight className="w-4 h-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {addresses.map((addr: any) => (
                         <div 
                           key={addr.id}
                           onClick={() => {
                             setSelectedAddressId(addr.id);
                             setShowAddressSelector(false);
                           }}
                           className={`p-4 rounded-xl border-2 transition cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                         >
                           <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-gray-900 text-sm">{addr.name || user.name}</span>
                                {addr.isDefault && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold tracking-wide">DEFAULT</span>}
                              </div>
                              <p className="text-xs text-gray-700 mb-0.5">{addr.line1}</p>
                              <p className="text-[11px] text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="text-[11px] text-indigo-600 font-semibold">Phone: {addr.phone || user.phone || 'N/A'}</p>
                           </div>
                           {selectedAddressId === addr.id && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                         </div>
                       ))}
                       <button 
                         onClick={() => setShowAddressSelector(false)}
                         className="w-full py-2 text-sm text-gray-500 font-bold hover:text-indigo-600"
                       >
                         Cancel
                       </button>
                     </div>
                   )}
                 </div>
               )}
            </div>

            {/* Cart Items Section */}
            <div className="space-y-4">
              {enrichedItems.map((item: any) => (
                <div key={item.productId} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border border-gray-100">
                  <div className="flex gap-4">
                    <Link to={`/p/${item.product.slug || item.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="flex-shrink-0">
                      <img
                        src={item.product.image || 'https://via.placeholder.com/150'}
                        alt={item.product.name}
                        className="w-32 h-32 object-cover rounded border border-gray-200"
                      />
                    </Link>

                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <Link
                          to={`/p/${item.product.slug || item.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
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
                          <span className="text-xl font-bold">{formatPrice(item.product.price)}</span>
                        </div>

                        <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                          <button
                            onClick={() => updateQuantityMutation.mutate({ productId: item.productId, delta: -1 })}
                            className="px-3 py-1.5 hover:bg-gray-200 transition cursor-pointer border-r border-gray-200"
                            disabled={updateQuantityMutation.isPending}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantityMutation.mutate({ productId: item.productId, delta: 1 })}
                            className="px-3 py-1.5 hover:bg-gray-200 transition cursor-pointer border-l border-gray-200"
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
          </div>

          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-2xl p-6 shadow-xl border border-purple-100">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                Price Details
              </h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal ({enrichedItems.length} items)
                  </span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-6 mb-8">
                <div className="flex justify-between text-xl">
                  <span className="font-bold">Total Amount</span>
                  <span className="font-bold text-2xl text-indigo-600">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRazorpayPayment}
                  disabled={!selectedAddress}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 hover:from-indigo-700 hover:to-purple-700 transition shadow-lg cursor-pointer text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src="https://razorpay.com/favicon.png" alt="Razorpay" className="w-6 h-6 brightness-0 invert" />
                  Pay with Razorpay
                </button>

                <button
                  onClick={handleCODPayment}
                  disabled={!selectedAddress}
                  className="w-full bg-white text-indigo-600 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 border-2 border-indigo-600 hover:bg-indigo-50 transition cursor-pointer text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cash on Delivery (COD)
                </button>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-6">
                By placing an order, you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and <Link to="/legal/privacy" className="underline">Privacy</Link>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">✓</div>
                <span>Safe and Secure Payments</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">✓</div>
                <span>100% Payment Protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
