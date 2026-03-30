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
}
