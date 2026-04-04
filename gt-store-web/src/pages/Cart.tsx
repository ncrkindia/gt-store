import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { useNotification } from '../context/NotificationContext';

import { PayPalButtons } from '@paypal/react-paypal-js';

const fetchCart = async () => {
  const res = await apiClient.get('/cart');
  return res.data;
};

const fetchProductsBulk = async (ids: string[]) => {
  if (!ids || ids.length === 0) return [];
  const res = await apiClient.post('/products/bulk', ids);
  return res.data;
};

const Cart = () => {
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  const { data: cart, isLoading: isCartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!keycloak.authenticated
  });

  const cartItems = cart?.items || [];
  const productIds = cartItems.map((item: any) => item.productId);

  const { data: products, isLoading: isProductsLoading } = useQuery({
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
      // 1. Create Internal Order
      const itemsWithPrice = cart.items.map((i: any) => {
        const p = products?.find((prod: any) => prod.id === i.productId);
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

      // 2. Create PayPal Order via Payment Service
      const paypalRes = await apiClient.post(`/payments/paypal/create/${orderId}`);
      return paypalRes.data.paypalOrderId;
    } catch (error: any) {
      showNotification('Failed to initiate checkout: ' + (error.response?.data || error.message), 'error');
      throw error;
    }
  };

  const handleOnApprove = async (data: any) => {
    try {
      // Capture PayPal payment
      await apiClient.post(`/payments/paypal/capture/${data.orderID}`);
      
      // Cleanup cart
      await apiClient.delete('/cart');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      
      showNotification('Payment Successful! Order Placed.', 'success');
    } catch (error: any) {
      showNotification('Payment verification failed: ' + (error.response?.data || error.message), 'error');
    }
  };

  if (!keycloak.authenticated) {
    return (
      <div className="page-container theme-bg">
        <h2 className="title-bold">Please Login to view your Cart</h2>
      </div>
    );
  }

  if (isCartLoading || (productIds.length > 0 && isProductsLoading)) {
    return <div className="page-container theme-bg">Loading your treasures...</div>;
  }

  // Calculate totals
  const enrichedItems = cartItems.map((item: any) => {
    const product = products?.find((p: any) => p.id === item.productId);
    return {
      ...item,
      name: product?.name || 'Unknown Product',
      price: product?.price || 0,
      image: product?.imageUrl || 'https://via.placeholder.com/80'
    };
  });

  const grandTotal = enrichedItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

  return (
    <div className="page-container theme-bg">
      <h1 className="title-bold" style={{ marginBottom: '2rem' }}>Your Shopping Bag</h1>

      {enrichedItems.length === 0 ? (
        <div className="empty-cart card-mochi">
          <p>Your bag is empty. Time to go shopping!</p>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items-list">
            {enrichedItems.map((item: any) => (
              <div key={item.productId} className="cart-item-card card-mochi">
                <div className="item-info">
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price-unit">${item.price.toFixed(2)} per item</p>
                  </div>
                </div>

                <div className="item-actions">
                  <div className="quantity-control">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantityMutation.mutate({ productId: item.productId, delta: -1 })}
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantityMutation.mutate({ productId: item.productId, delta: 1 })}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    <p className="total-label">Subtotal</p>
                    <p className="total-value">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>

                  <button
                    className="remove-btn-mochi"
                    onClick={() => removeMutation.mutate(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary card-mochi">
            <h2 className="summary-title">Summary</h2>
            <div className="summary-row">
              <span>Items Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span className="free-label">FREE</span>
            </div>
            <hr className="summary-divider" />
            <div className="summary-row total-row">
              <span>Grand Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <PayPalButtons 
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "checkout" }}
                createOrder={handleCreatePayPalOrder}
                onApprove={handleOnApprove}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Cart;
