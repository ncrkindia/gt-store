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
        
        Page<Product> resultPage;
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            TextCriteria textCriteria = TextCriteria.forDefaultLanguage().matching(keyword);
            resultPage = productRepository.findAllBy(textCriteria, pageable);
        } else if (categoryId != null && !categoryId.trim().isEmpty()) {
            resultPage = productRepository.findByCategoryIdsContaining(categoryId, pageable);
        } else {
            resultPage = productRepository.findAll(pageable);
        }

        // Filter reviews to only show APPROVED ones
        resultPage.forEach(product -> {
            if (product.getReviews() != null) {
                List<com.gtstore.productservice.document.Review> approvedReviews = product.getReviews().stream()
                    .filter(r -> "APPROVED".equals(r.getStatus()))
                    .collect(java.util.stream.Collectors.toList());
                product.setReviews(approvedReviews);
            }
        });

        return resultPage;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable String id) {
        return productRepository.findById(id)
                .map(product -> {
                    // Filter reviews to only show APPROVED ones
                    if (product.getReviews() != null) {
                        List<com.gtstore.productservice.document.Review> approvedReviews = product.getReviews().stream()
                            .filter(r -> "APPROVED".equals(r.getStatus()))
                            .collect(java.util.stream.Collectors.toList());
                        product.setReviews(approvedReviews);
                    }
                    return ResponseEntity.ok(product);
                })
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

    @PostMapping("/{id}/images")
    public ResponseEntity<Product> linkProductImages(@PathVariable String id, @RequestBody List<String> imageUrls) {
        return productRepository.findById(id).map(product -> {
            product.setImages(imageUrls);
            Product updated = productRepository.save(product);
            kafkaTemplate.send(TOPIC_UPSERT, updated.getId(), updated);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
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

    @PostMapping("/{id}/reviews")
    public ResponseEntity<?> addReview(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestHeader(value = "X-User-Name", required = false) String name,
            @RequestBody com.gtstore.productservice.document.Review review) {
        
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        return productRepository.findById(id).map(product -> {
            review.setDate(java.time.LocalDateTime.now());
            review.setUserName(name != null ? name : email);
            if (review.getId() == null) {
                review.setId(java.util.UUID.randomUUID().toString());
            }
            
            // Limit images to 5
            if (review.getImages() != null && review.getImages().size() > 5) {
                review.setImages(review.getImages().subList(0, 5));
            }
            
            // Set status to PENDING for async processing
            review.setStatus("PENDING");

            if (product.getReviews() == null) {
                product.setReviews(new java.util.ArrayList<>());
            }
            product.getReviews().add(review);
            
            Product updated = productRepository.save(product);
            
            java.util.Map<String, String> payload = new java.util.HashMap<>();
            payload.put("productId", updated.getId());
            payload.put("reviewId", review.getId());
            kafkaTemplate.send("review.submitted", payload);

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Admin endpoints for Reviews
    @GetMapping("/reviews/pending")
    public ResponseEntity<List<Product>> getPendingReviews() {
        java.util.Set<String> seen = new java.util.HashSet<>();
        List<Product> results = new java.util.ArrayList<>();
        for (Product p : productRepository.findByReviewsStatus("NEEDS_REVIEW")) {
            if (seen.add(p.getId())) results.add(p);
        }
        for (Product p : productRepository.findByReviewsStatus("PENDING")) {
            if (seen.add(p.getId())) results.add(p);
        }
        return ResponseEntity.ok(results);
    }

    @PutMapping("/{id}/reviews/{reviewId}/status")
    public ResponseEntity<?> updateReviewStatus(
            @PathVariable String id,
            @PathVariable String reviewId,
            @RequestParam String status) {
        
        return productRepository.findById(id).map(product -> {
            if (product.getReviews() != null) {
                for (com.gtstore.productservice.document.Review r : product.getReviews()) {
                    if (reviewId.equals(r.getId())) {
                        r.setStatus(status.toUpperCase());
                        break;
                    }
                }
            }
            
            // Recalculate based on APPROVED reviews only
            List<com.gtstore.productservice.document.Review> approvedReviews = product.getReviews() == null ? 
                new java.util.ArrayList<>() : 
                product.getReviews().stream()
                    .filter(r -> "APPROVED".equals(r.getStatus()))
                    .collect(java.util.stream.Collectors.toList());
            
            if (!approvedReviews.isEmpty()) {
                int totalRatings = approvedReviews.stream().mapToInt(com.gtstore.productservice.document.Review::getRating).sum();
                product.setReviewCount(approvedReviews.size());
                product.setRating((double) totalRatings / approvedReviews.size());
                
                java.util.Map<Integer, Integer> breakdown = new java.util.HashMap<>();
                for (com.gtstore.productservice.document.Review r : approvedReviews) {
                    breakdown.put(r.getRating(), breakdown.getOrDefault(r.getRating(), 0) + 1);
                }
                product.setRatingBreakdown(breakdown);
            } else {
                product.setReviewCount(0);
                product.setRating(0.0);
                product.setRatingBreakdown(new java.util.HashMap<>());
            }

            Product updated = productRepository.save(product);
            kafkaTemplate.send(TOPIC_UPSERT, updated.getId(), updated);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping("/sync")
    public ResponseEntity<String> syncAllProducts() {
        List<Product> products = productRepository.findAll();
        products.forEach(product -> kafkaTemplate.send(TOPIC_UPSERT, product.getId(), product));
        return ResponseEntity.ok("Synced " + products.size() + " products to Search service.");
    }
}

