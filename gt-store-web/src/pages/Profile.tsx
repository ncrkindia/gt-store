import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';

const fetchProfile = async () => {
  const [profileRes, ordersRes] = await Promise.all([
    apiClient.get('/users/me'),
    apiClient.get('/orders')
  ]);
  return {
    profile: profileRes.data,
    orders: ordersRes.data
  };
};

const Profile = () => {
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: !!keycloak.authenticated
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => apiClient.put(`/orders/${orderId}/status?status=CANCELLED`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  if (!keycloak.authenticated) return null;
  if (isLoading) return <div className="page-container">Loading Profile...</div>;
  if (error) return <div className="page-container">Error Loading Profile.</div>;

  const getBadgeClass = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'PENDING': return 'badge-pending';
      case 'SHIPPED': return 'badge-shipped';
      case 'DELIVERED': return 'badge-delivered';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-pending';
    }
  };

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : 'U';
  const userName = data?.profile?.user?.name || 'Customer';
  const userEmail = data?.profile?.user?.email || keycloak.tokenParsed?.email;

  return (
    <div className="profile-layout">
      {/* Sidebar: Profile Details */}
      <div className="profile-sidebar">
        <div className="profile-avatar">
          {getInitials(userName)}
        </div>
        <div className="profile-info">
          <h3>{userName}</h3>
          <p>{userEmail}</p>
        </div>
        
        <button 
          className="btn-outline" 
          onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
          style={{ width: '100%' }}
        >
          Log Out
        </button>
      </div>

      {/* Main Content: Order History */}
      <div className="order-history">
        <h2 className="section-header">Order History</h2>
        
        {(!data?.orders || data.orders.length === 0) && (
          <div className="order-card" style={{ textAlign: 'center' }}>
            <p>You haven't placed any orders yet. Treat yourself!</p>
          </div>
        )}

        {data?.orders?.map((order: any) => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div>
                <h4>Order #{order.id.substring(0, 8)}...</h4>
                {order.createdAt && <p>{new Date(order.createdAt).toLocaleDateString()}</p>}
              </div>
              <span className={`order-badge ${getBadgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>

            <div className="order-items">
              {order.orderItems?.map((item: any) => (
                <div key={item.id || item.productId} className="order-item-row">
                  <span>{item.quantity}x Item ({item.productId.substring(0,8)})</span>
                  <span>${item.price?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="order-footer">
              <span className="order-total">Total: ${order.totalAmount?.toFixed(2)}</span>
              
              {order.status === 'PENDING' && (
                <button 
                  className="btn-danger"
                  onClick={() => cancelOrderMutation.mutate(order.id)}
                  disabled={cancelOrderMutation.isPending}
                  style={{ width: 'auto' }}
                >
                  {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
