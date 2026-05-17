package com.gtstore.productservice.repository;

import com.gtstore.productservice.document.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * MongoDB repository for Product documents.
 * Supports full-text search and category filtering with pagination.
 */
@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    
    Page<Product> findAllBy(TextCriteria textCriteria, Pageable pageable);
    
    Page<Product> findByCategoryIdsContaining(String categoryId, Pageable pageable);

    @org.springframework.data.mongodb.repository.Query("{ 'reviews.status': ?0 }")
    java.util.List<Product> findByReviewsStatus(String status);

    Page<Product> findByBrandIgnoreCase(String brand, Pageable pageable);

    Page<Product> findByListedNot(Boolean listed, Pageable pageable);
    Page<Product> findByCategoryIdsContainingAndListedNot(String categoryId, Boolean listed, Pageable pageable);
    Page<Product> findByBrandIgnoreCaseAndListedNot(String brand, Boolean listed, Pageable pageable);
    Page<Product> findAllByAndListedNot(TextCriteria textCriteria, Boolean listed, Pageable pageable);

    java.util.Optional<Product> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
