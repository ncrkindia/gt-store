package com.gtstore.productservice.controller;

import com.gtstore.productservice.document.Product;
import com.gtstore.productservice.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;


/**
 * REST Controller for the Product Service.
 * Provides endpoints for browsing, searching, and managing the product catalog.
 * 
 * Public: GET /api/products (Listing & Search)
 * Admin: POST/PUT/DELETE (Catalog Management)
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate;

    private static final String TOPIC_UPSERT = "product.upserted";
    private static final String TOPIC_DELETE = "product.deleted";

    @GetMapping
    public Page<Product> getAllProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            TextCriteria textCriteria = TextCriteria.forDefaultLanguage().matching(keyword);
            return productRepository.findAllBy(textCriteria, pageable);
        } else if (categoryId != null && !categoryId.trim().isEmpty()) {
            return productRepository.findByCategoryIdsContaining(categoryId, pageable);
        }
        
        return productRepository.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable String id) {
        return productRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/bulk")
    public List<Product> getProductsBulk(@RequestBody List<String> ids) {
        return (List<Product>) productRepository.findAllById(ids);
    }

    // Secured endpoints (requires Keycloak JWT token with write roles ideally)
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product saved = productRepository.save(product);
        kafkaTemplate.send(TOPIC_UPSERT, saved.getId(), saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable String id, @RequestBody Product product) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        product.setId(id);
        Product updated = productRepository.save(product);
        kafkaTemplate.send(TOPIC_UPSERT, updated.getId(), updated);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable String id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        productRepository.deleteById(id);
        kafkaTemplate.send(TOPIC_DELETE, id, id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/sync")
    public ResponseEntity<String> syncAllProducts() {
        List<Product> products = productRepository.findAll();
        products.forEach(product -> kafkaTemplate.send(TOPIC_UPSERT, product.getId(), product));
        return ResponseEntity.ok("Synced " + products.size() + " products to Search service.");
    }
}

