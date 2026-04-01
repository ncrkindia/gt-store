import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { useNotification } from '../context/NotificationContext';

const fetchSearchResults = async (query: string) => {
  const res = await apiClient.get(`/search?q=${query}`);
  return res.data || [];
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const { keycloak } = useKeycloak();
  const { showNotification } = useNotification();

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['search', q],
    queryFn: () => fetchSearchResults(q),
    enabled: !!q
  });

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!keycloak.authenticated) {
      keycloak.login();
      return;
    }
    try {
      await apiClient.post('/cart/items', { productId, quantity: 1 });
      showNotification('Added to cart!', 'success');
    } catch (err) {
      showNotification('Failed to add to cart.', 'error');
    }
  };

  if (isLoading) return (
    <div className="main-content">
      <div className="page-container">
        <h2 className="section-header">Searching for "{q}"...</h2>
      </div>
    </div>
  );

  if (error) return (
    <div className="main-content">
      <div className="page-container">
        <h2 className="section-header" style={{color: 'var(--color-pink)'}}>Search Failed</h2>
        <p style={{textAlign: 'center', fontWeight: 700}}>We couldn't connect to the search service. Please try again later.</p>
      </div>
    </div>
  );

  return (
    <div className="main-content">
      <div className="page-container" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
        <h1 className="section-header">Search Results</h1>
        <p style={{ textAlign: 'center', fontWeight: 800, color: 'var(--secondary-hover)', marginBottom: '2rem' }}>
          Found {results?.length || 0} items for "{q}"
        </p>

        <div className="product-grid">
          {results?.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: '#fff', border: 'var(--border-width) solid #000', borderRadius: 'var(--radius)' }}>
               <h2 style={{ fontWeight: 900 }}>No toys found! 🧸</h2>
               <p style={{ fontWeight: 700 }}>Try searching for something else, like "puzzle" or "car".</p>
            </div>
          )}
          
          {results?.map((product: any) => (
            <Link to={`/product/${product.id}`} key={product.id} className="product-card" style={{ textDecoration: 'none' }}>
              <div className="product-image-wrap">
                <img 
                  src={product.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image'} 
                  alt={product.name} 
                  className="product-image" 
                />
              </div>
              <div className="product-card-body">
                <h3>{product.name}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">₹{product.price}</span>
                  {product.brand && <span className="order-badge badge-shipped" style={{ fontSize: '0.7rem' }}>{product.brand}</span>}
                </div>
                <button 
                  className="primary-btn product-btn" 
                  onClick={(e) => handleAddToCart(e, product.id)}
                >
                  Add to Cart
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;

