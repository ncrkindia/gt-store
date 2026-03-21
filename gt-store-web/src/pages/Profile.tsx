import React from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: !!keycloak.authenticated
  });

  if (!keycloak.authenticated) return null;
  if (isLoading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">Error Loading Profile</div>;

  return (
    <div className="page-container">
      <h1>My Profile</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>Details</h3>
        <p><strong>Email:</strong> {data?.profile?.user?.email}</p>
        <p><strong>Name:</strong> {data?.profile?.user?.name}</p>
      </div>

      <div>
        <h3>Recent Orders</h3>
        {data?.orders?.length === 0 && <p>No orders placed yet.</p>}
        {data?.orders?.map((order: any) => (
          <div key={order.id} style={{ borderBottom: '1px solid gray', padding: '1rem 0' }}>
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Total:</strong> ${order.totalAmount}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
