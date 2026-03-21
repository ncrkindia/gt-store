import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';

const fetchProducts = async () => {
  // Directly calling the API Gateway -> Product Service
  const res = await apiClient.get('/products');
  return res.data.content || [];
};

const Products = () => {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'], 
    queryFn: fetchProducts
  });

  const { keycloak } = useKeycloak();

  const handleAddToCart = async (productId: string) => {
    if (!keycloak.authenticated) {
      keycloak.login();
      return;
    }
    
    try {
      await apiClient.post('/cart/items', {
        productId,
        quantity: 1
      });
      alert('Added to cart!');
    } catch (err) {
      console.error(err);
      alert('Failed to add to cart.');
    }
  };

  if (isLoading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">Error loading products.</div>;

  return (
    <div className="page-container">
      <h1>Catalog</h1>
      <div className="product-grid">
        {products.length === 0 && <p>No products found.</p>}
        {products.map((product: any) => (
          <div key={product.id} className="product-card">
            {product.images && product.images[0] && (
              <div className="product-image-wrap">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="product-image"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="product-card-body">
              <h3>{product.name}</h3>
              {product.description && product.description !== product.name && (
                <p className="product-desc">{product.description}</p>
              )}
              <div className="product-footer">
                <span className="product-price">₹{product.price?.toLocaleString('en-IN')}</span>
                {product.rating && (
                  <span className="product-rating">⭐ {product.rating} ({product.reviewCount})</span>
                )}
              </div>
              <button
                className="primary-btn product-btn"
                onClick={() => handleAddToCart(product.id)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
