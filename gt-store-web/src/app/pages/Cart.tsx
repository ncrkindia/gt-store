import { Link } from "react-router";
import { Trash2, Plus, Minus, ShoppingBag, Tag, MapPin, ChevronRight, CheckCircle2, Info, ChevronDown, ChevronUp } from "lucide-react";
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
      features: p.features || [],
      gstPercentage: p.gstPercentage !== undefined ? p.gstPercentage : 18
    };
  });
};

export function Cart() {
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [pointsToUseInput, setPointsToUseInput] = useState<number>(0);
  const [appliedPoints, setAppliedPoints] = useState<number>(0);
  const [showAllCoupons, setShowAllCoupons] = useState(false);

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
    if (products && !product) return null;
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
  }).filter(Boolean) as any[];

  const { data: calculation, isLoading: isCalculating } = useQuery({
    queryKey: ['orderCalculation', cart?.items, appliedCoupon, appliedPoints],
    queryFn: async () => {
      if (!cart || !cart.items || cart.items.length === 0) return null;
      const payload = {
        items: cart.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: 0 // Server will determine true price
        })),
        couponCode: appliedCoupon,
        loyaltyPointsToUse: appliedPoints
      };
      const res = await apiClient.post('/orders/calculate', payload);
      return res.data;
    },
    enabled: !!cart && !!cart.items && cart.items.length > 0
  });

  const subtotal = calculation?.baseSubtotal || 0;
  const shipping = calculation?.shippingCharge || 0;
  const total = calculation?.finalPayable || 0;

  // Available Coupons querying
  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ['coupons'],
    queryFn: async () => {
      const res = await apiClient.get('/orders/coupons');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!keycloak.authenticated
  });

  const isCouponApplicable = (coupon: any) => {
    if (!coupon.active) return false;
    
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) return false;
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) return false;
    
    // Min order value check
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) return false;
    
    // User specific check
    if (coupon.applicableUserIds && coupon.applicableUserIds.trim().length > 0) {
      const email = keycloak.tokenParsed?.email || '';
      const userId = keycloak.tokenParsed?.sub || '';
      const allowed = coupon.applicableUserIds.split(',').map((s: string) => s.trim().toLowerCase());
      const hasAccess = allowed.includes(email.toLowerCase()) || allowed.includes(userId.toLowerCase());
      if (!hasAccess) return false;
    }
    
    // Min quantity check
    if (coupon.minQuantity && coupon.minQuantity > 0) {
      const applicableProdIds = coupon.applicableProductIds 
        ? coupon.applicableProductIds.split(',').map((s: string) => s.trim()) 
        : [];
      
      const totalQty = enrichedItems.reduce((sum, item) => {
        const matches = applicableProdIds.length === 0 || applicableProdIds.includes(item.productId);
        return sum + (matches ? item.quantity : 0);
      }, 0);
      
      if (totalQty < coupon.minQuantity) return false;
    }
    
    return true;
  };

  const estimateDiscount = (coupon: any) => {
    if (!isCouponApplicable(coupon)) return 0;
    
    const isPercent = coupon.discountType.includes("PERCENT");
    const isCart = coupon.discountType.includes("CART");
    const val = Number(coupon.discountValue);
    
    if (isCart) {
      if (isPercent) {
        let discount = subtotal * (val / 100);
        if (coupon.maxDiscountCap) {
          discount = Math.min(discount, Number(coupon.maxDiscountCap));
        }
        return discount;
      } else {
        return Math.min(val, subtotal);
      }
    } else {
      // Product specific
      const applicableProdIds = coupon.applicableProductIds 
        ? coupon.applicableProductIds.split(',').map((s: string) => s.trim()) 
        : [];
      
      let applicableAmt = enrichedItems.reduce((sum, item) => {
        const matches = applicableProdIds.length === 0 || applicableProdIds.includes(item.productId);
        return sum + (matches ? (item.product.price * item.quantity) : 0);
      }, 0);
      
      if (isPercent) {
        let discount = applicableAmt * (val / 100);
        if (coupon.maxDiscountCap) {
          discount = Math.min(discount, Number(coupon.maxDiscountCap));
        }
        return discount;
      } else {
        return Math.min(val, applicableAmt);
      }
    }
  };

  const getCouponHumanDescription = (coupon: any) => {
    const isPercent = coupon.discountType.includes("PERCENT");
    const isCart = coupon.discountType.includes("CART");
    const val = Number(coupon.discountValue);

    let desc = "";
    if (isPercent) {
      desc = `${val}% OFF`;
      if (coupon.maxDiscountCap) {
        desc += ` up to ₹${coupon.maxDiscountCap}`;
      }
    } else {
      desc = `Flat ₹${val} OFF`;
    }

    if (isCart) {
      desc += " on entire order value.";
    } else {
      desc += " on selected promotional products.";
    }

    const rules = [];
    if (coupon.minOrderValue) {
      rules.push(`Valid on orders above ₹${coupon.minOrderValue}`);
    }
    if (coupon.minQuantity && coupon.minQuantity > 1) {
      rules.push(`Requires at least ${coupon.minQuantity} items`);
    }
    if (coupon.applicableUserIds) {
      rules.push("Exclusive user-only offer");
    }

    return {
      main: desc,
      rules: rules.length > 0 ? rules.join(" • ") : "No special order conditions."
    };
  };

  const activeCoupons = coupons.filter((c: any) => {
    if (!c.active) return false;
    const now = new Date();
    if (c.expiryDate && new Date(c.expiryDate) < now) return false;
    return true;
  });

  const sortedCoupons = [...activeCoupons].sort((a: any, b: any) => {
    const appA = isCouponApplicable(a) ? 1 : 0;
    const appB = isCouponApplicable(b) ? 1 : 0;
    if (appA !== appB) return appB - appA;
    
    const saveA = estimateDiscount(a);
    const saveB = estimateDiscount(b);
    return saveB - saveA;
  });

  const visibleCoupons = showAllCoupons ? sortedCoupons : sortedCoupons.slice(0, 5);

  const gstItems = calculation?.items || [];
  const totalTaxable = gstItems.reduce((sum: number, item: any) => sum + (item.taxableAmount || 0), 0);
  const totalGst = gstItems.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0);
  const totalCgst = totalGst / 2;
  const totalSgst = totalGst / 2;

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
      couponCode: appliedCoupon || null,
      loyaltyPointsUsed: appliedPoints || 0,
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
            {/* Promo Code Section */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                Apply Coupon
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Coupon Code"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  className="flex-1 border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setAppliedCoupon(couponCodeInput)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
                  disabled={isCalculating}
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <div className="mt-2 text-sm text-emerald-600 flex justify-between">
                  <span>Coupon Applied: <strong>{appliedCoupon}</strong></span>
                  <button onClick={() => { setAppliedCoupon(''); setCouponCodeInput(''); }} className="text-red-500 underline text-xs">Remove</button>
                </div>
              )}

              {/* Available Coupons list */}
              {sortedCoupons.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Available Coupons</h4>
                  
                  <div className="space-y-2">
                    {visibleCoupons.map((coupon) => {
                      const applicable = isCouponApplicable(coupon);
                      const saving = estimateDiscount(coupon);
                      const isApplied = appliedCoupon === coupon.code;
                      const humanDesc = getCouponHumanDescription(coupon);
                      
                      return (
                        <div 
                          key={coupon.id} 
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition relative group ${
                            applicable 
                              ? isApplied 
                                ? 'border-emerald-500 bg-emerald-50/30' 
                                : 'border-indigo-100 bg-indigo-50/10 hover:border-indigo-300'
                              : 'border-gray-200 bg-gray-50/50 opacity-60'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs font-black px-2 py-0.5 rounded tracking-wide ${
                                applicable
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                {coupon.code}
                              </span>
                              
                              {applicable && saving > 0 && (
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                  Save ₹{saving}
                                </span>
                              )}
                              
                              {/* Hoverable Info Icon for Description */}
                              <div className="relative inline-block cursor-help group/info">
                                <Info className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600 transition" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/info:block z-20 w-56 bg-slate-900 text-white text-[11px] p-2.5 rounded-lg shadow-xl leading-relaxed">
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                                  <p className="font-bold mb-1 text-indigo-400">{humanDesc.main}</p>
                                  <p className="text-gray-300">{humanDesc.rules}</p>
                                  {!applicable && coupon.minOrderValue && subtotal < coupon.minOrderValue && (
                                    <p className="mt-1.5 text-rose-400 font-bold">Add ₹{coupon.minOrderValue - subtotal} more to qualify</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-500 mt-1 truncate">
                              {humanDesc.main}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (applicable) {
                                if (isApplied) {
                                  setAppliedCoupon('');
                                  setCouponCodeInput('');
                                } else {
                                  setAppliedCoupon(coupon.code);
                                  setCouponCodeInput(coupon.code);
                                }
                              }
                            }}
                            disabled={!applicable}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                              applicable
                                ? isApplied
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isApplied ? 'Applied' : 'Apply'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Expand / Collapse Button */}
                  {sortedCoupons.length > 5 && (
                    <button
                      onClick={() => setShowAllCoupons(!showAllCoupons)}
                      className="w-full py-2 flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition cursor-pointer"
                    >
                      {showAllCoupons ? (
                        <>
                          Show Less <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          Show More ({sortedCoupons.length - 5} options) <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Loyalty Points Section */}
            {user?.loyaltyPoints > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-amber-500 text-xl">★</span>
                  GT Loyalty Points
                </h3>
                <p className="text-sm text-gray-600 mb-3">You have <strong>{user.loyaltyPoints}</strong> points available.</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max={user.loyaltyPoints}
                    value={pointsToUseInput}
                    onChange={(e) => setPointsToUseInput(Number(e.target.value))}
                    className="flex-1 border-gray-300 rounded-lg shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => setAppliedPoints(pointsToUseInput)}
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 transition"
                    disabled={isCalculating}
                  >
                    Redeem
                  </button>
                </div>
                {appliedPoints > 0 && (
                  <div className="mt-2 text-sm text-emerald-600 flex justify-between">
                    <span>Redeeming: <strong>{appliedPoints} pts</strong></span>
                    <button onClick={() => { setAppliedPoints(0); setPointsToUseInput(0); }} className="text-red-500 underline text-xs">Cancel</button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-2xl p-6 shadow-xl border border-purple-100 relative">
              {isCalculating && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl z-10 backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                Order Summary
              </h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Subtotal ({enrichedItems.length} items)</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                
                {(calculation?.productDiscounts > 0 || calculation?.cartDiscounts > 0) && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount (Coupon)</span>
                    <span className="font-semibold">- {formatPrice((calculation?.productDiscounts || 0) + (calculation?.cartDiscounts || 0))}</span>
                  </div>
                )}

                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50 space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-indigo-800">
                    <span>GST (Included in Prices)</span>
                    <span>{formatPrice(totalGst)}</span>
                  </div>
                  
                  <div className="pl-3 border-l-2 border-indigo-200 space-y-1.5 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Total Taxable (Base) Value</span>
                      <span>{formatPrice(totalTaxable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CGST (Central Tax)</span>
                      <span>{formatPrice(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (State Tax)</span>
                      <span>{formatPrice(totalSgst)}</span>
                    </div>
                  </div>

                  {gstItems.length > 0 && (
                    <details className="text-xs group mt-2">
                      <summary className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer list-none flex items-center justify-between">
                        <span>Show Item-wise GST Breakup</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="mt-3 space-y-2.5 pt-2.5 border-t border-indigo-100/50 overflow-x-auto">
                        <table className="w-full text-[10px] text-gray-500">
                          <thead>
                            <tr className="border-b border-indigo-100 font-semibold text-gray-700 text-left">
                              <th className="pb-1">Product</th>
                              <th className="pb-1 text-center">GST %</th>
                              <th className="pb-1 text-right">Taxable</th>
                              <th className="pb-1 text-right">GST</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gstItems.map((item: any) => {
                              const enriched = enrichedItems.find((e: any) => e.productId === item.productId);
                              const name = enriched?.product?.name || "Product Item";
                              return (
                                <tr key={item.productId} className="border-b border-indigo-50/40">
                                  <td className="py-1.5 max-w-[120px] truncate">{name}</td>
                                  <td className="py-1.5 text-center">{item.gstPercentage}%</td>
                                  <td className="py-1.5 text-right">{formatPrice(item.taxableAmount || 0)}</td>
                                  <td className="py-1.5 text-right font-medium text-gray-700">{formatPrice(item.gstAmount || 0)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </div>

                {calculation?.loyaltyPointsUsed > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Loyalty Points Redeemed</span>
                    <span className="font-semibold">- {formatPrice(calculation?.loyaltyPointsUsed || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping Charge</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-6 mb-6">
                <div className="flex justify-between text-xl">
                  <span className="font-bold">Final Payable</span>
                  <span className="font-bold text-2xl text-indigo-600">{formatPrice(total)}</span>
                </div>
              </div>

              {calculation?.loyaltyPointsToEarn > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <span className="text-amber-500 text-lg select-none">★</span>
                  <div>
                    <p className="text-sm font-bold text-amber-950">
                      Earn <span className="text-amber-700 font-extrabold">{calculation.loyaltyPointsToEarn}</span> Loyalty Points!
                    </p>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      These points will be added to your account 15 days after successful delivery of the order.
                    </p>
                  </div>
                </div>
              )}

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
