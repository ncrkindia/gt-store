import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>Welcome to GT Store</h1>
        <p>Your one-stop shop for modern electronics and fashion.</p>
        <Link to="/products" className="primary-btn hero-btn">
          Shop Now
        </Link>
      </section>

      <section className="featured-section">
        <h2 className="section-header">Shop by Category</h2>
        <div className="category-grid">
          <div className="category-card cat-green">Electronics</div>
          <div className="category-card cat-blue">Clothing</div>
          <div className="category-card cat-orange">Home & Kitchen</div>
        </div>
      </section>
    </div>
  );
};

export default Home;
