import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';

const fetchCart = async () => {
  const res = await apiClient.get('/cart');
  return res.data;
};

const Cart = () => {
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!keycloak.authenticated
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/cart/items/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const checkoutMutation = useMutation({
    mutationFn: (cartData: any) => apiClient.post('/orders', {
      shippingAddressId: 1, // hardcoded for MVP
      items: cartData.items.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: 99.99 // Should come from Product service in full app
      }))
    }),
    onSuccess: async () => {
      await apiClient.delete('/cart'); // Clear cart after order
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      alert('Order Placed Successfully!');
    }
  });

  if (!keycloak.authenticated) {
    return (
      <div className="page-container">
        <h2>Please Login to view your Cart</h2>
      </div>
    );
  }

  if (isLoading) return <div className="page-container">Loading cart...</div>;

  const items = cart?.items || [];

  return (
    <div className="page-container">
      <h1>Your Cart</h1>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="cart-list">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="cart-item">
              <span>Product ID: {item.productId}</span>
              <span>Qty: {item.quantity}</span>
              <button 
                className="secondary-btn" 
                onClick={() => removeItemMutation.mutate(item.productId)}
              >
                Remove
              </button>
            </div>
          ))}
          <div style={{ marginTop: '2rem' }}>
            <button className="primary-btn" onClick={() => checkoutMutation.mutate(cart)}>
              Checkout & Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
