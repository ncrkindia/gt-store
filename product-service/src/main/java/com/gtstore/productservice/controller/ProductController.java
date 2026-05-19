package com.gtstore.productservice.controller;

import com.gtstore.productservice.document.Product;
import com.gtstore.productservice.document.ProductVariant;
import com.gtstore.productservice.document.PriceHistoryRecord;
import com.gtstore.productservice.repository.ProductRepository;
import com.gtstore.productservice.repository.CategoryRepository;
import com.gtstore.productservice.repository.BrandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    private CategoryRepository categoryRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    private static final String TOPIC_UPSERT = "product.upserted";
    private static final String TOPIC_DELETE = "product.deleted";

    @GetMapping
    public Page<Product> getAllProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String brand,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean includeUnlisted) {
        
        
        // Core Feature Expansion: Priority promotions sorting tier.
        // Dynamically injects an explicit Sort composite:
        // 1. Promoted products (true) always bubble up first.
        // 2. Product priority scores (higher) define exact item sequence placement inside the promoted shelf.
        Sort sort = Sort.by(Sort.Direction.DESC, "promoted")
                        .and(Sort.by(Sort.Direction.DESC, "promotionPriority"));
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Product> resultPage;
        
        if (includeUnlisted) {
            if (keyword != null && !keyword.trim().isEmpty()) {
                TextCriteria textCriteria = TextCriteria.forDefaultLanguage().matching(keyword);
                resultPage = productRepository.findAllBy(textCriteria, pageable);
            } else if (categoryId != null && !categoryId.trim().isEmpty()) {
                resultPage = productRepository.findByCategoryIdsContaining(categoryId, pageable);
            } else if (brand != null && !brand.trim().isEmpty()) {
                resultPage = productRepository.findByBrandIgnoreCase(brand, pageable);
            } else {
                resultPage = productRepository.findAll(pageable);
            }
        } else {
            if (keyword != null && !keyword.trim().isEmpty()) {
                TextCriteria textCriteria = TextCriteria.forDefaultLanguage().matching(keyword);
                resultPage = productRepository.findAllByAndListedNot(textCriteria, false, pageable);
            } else if (categoryId != null && !categoryId.trim().isEmpty()) {
                resultPage = productRepository.findByCategoryIdsContainingAndListedNot(categoryId, false, pageable);
            } else if (brand != null && !brand.trim().isEmpty()) {
                resultPage = productRepository.findByBrandIgnoreCaseAndListedNot(brand, false, pageable);
            } else {
                resultPage = productRepository.findByListedNot(false, pageable);
            }
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
    public ResponseEntity<Product> getProduct(
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean includeUnlisted) {
        return productRepository.findById(id)
                .map(product -> {
                    if (!includeUnlisted && !product.getListed()) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).<Product>build();
                    }
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

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Product> getProductBySlug(
            @PathVariable String slug,
            @RequestParam(defaultValue = "false") boolean includeUnlisted) {
        return productRepository.findBySlug(slug)
                .map(product -> {
                    if (!includeUnlisted && !product.getListed()) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).<Product>build();
                    }
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
    public List<Product> getProductsBulk(
            @RequestBody List<String> ids,
            @RequestParam(defaultValue = "false") boolean includeUnlisted) {
        List<Product> products = (List<Product>) productRepository.findAllById(ids);
        if (includeUnlisted) {
            return products;
        }
        return products.stream()
                .filter(p -> p.getListed())
                .collect(java.util.stream.Collectors.toList());
    }

    @PutMapping("/bulk/listing")
    public ResponseEntity<Void> updateListingBulk(
            @RequestParam boolean listed,
            @RequestBody List<String> ids) {
        List<Product> products = (List<Product>) productRepository.findAllById(ids);
        for (Product product : products) {
            product.setListed(listed);
            productRepository.save(product);
            kafkaTemplate.send(TOPIC_UPSERT, product.getId(), product);
        }
        return ResponseEntity.ok().build();
    }

    private void ensureStandardVariant(Product product) {
        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            ProductVariant std = new ProductVariant();
            std.setVariantId(1L);
            std.setName("Standard");
            std.setGrouping("Option");
            std.setPrice(product.getPrice());
            std.setSalePrice(product.getSalePrice());
            std.setInStock(product.getInStock());
            std.setSequence(0);
            product.getVariants().add(std);
        } else {
            // Ensure every variant has a sequence. Default to 0 if null.
            for (ProductVariant v : product.getVariants()) {
                if (v.getSequence() == null) {
                    v.setSequence(0);
                }
            }
        }
        // Sort variants by sequence ascending
        product.getVariants().sort(java.util.Comparator.comparingInt(ProductVariant::getSequence));
        // Sync product main price to the first/default variant
        if (!product.getVariants().isEmpty()) {
            ProductVariant mainVar = product.getVariants().get(0);
            if (mainVar.getPrice() != null) {
                product.setPrice(mainVar.getPrice());
            }
            if (mainVar.getSalePrice() != null) {
                product.setSalePrice(mainVar.getSalePrice());
            }
        }
    }

    private void generateSlug(Product product) {
        // Build clean base: brand-name (using brand name and product name only)
        StringBuilder sb = new StringBuilder();
        
        if (product.getBrand() != null && !product.getBrand().trim().isEmpty()) {
            sb.append(product.getBrand().trim()).append("-");
        }
        
        if (product.getName() != null) {
            sb.append(product.getName().trim());
        }

        // Sanitize: lowercase, trim, convert non-alphanum to hyphen, collapse multiple hyphens
        String base = sb.toString().toLowerCase().trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", ""); // Trim start/end hyphens
        
        if (base.isEmpty()) {
            base = "product";
        }

        String uniqueSlug = base;
        int counter = 1;
        
        // Ensure absolute uniqueness loop
        while (true) {
            java.util.Optional<Product> existing = productRepository.findBySlug(uniqueSlug);
            // If it doesn't exist, OR the existing product is US, accept it!
            if (existing.isEmpty() || existing.get().getId().equals(product.getId())) {
                break;
            }
            uniqueSlug = base + "-" + (++counter);
            if (counter > 100) {
                uniqueSlug = base + "-" + java.util.UUID.randomUUID().toString().substring(0, 5);
                break;
            }
        }
        
        product.setSlug(uniqueSlug);
    }

    private void validateProduct(Product product) {
        if (product.getBrand() == null || product.getBrand().trim().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Product brand is required."
            );
        }
        boolean brandExists = brandRepository.findByNameIgnoreCase(product.getBrand().trim()).isPresent();
        if (!brandExists) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Target brand '" + product.getBrand() + "' is not registered in catalog system."
            );
        }
        if (product.getCategoryIds() == null || product.getCategoryIds().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Product registration requires at least one Category association."
            );
        }
        for (String catId : product.getCategoryIds()) {
            boolean exists = categoryRepository.findById(catId).isPresent() || categoryRepository.findBySlug(catId).isPresent();
            if (!exists) {
                throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Referenced Category ID/Slug '" + catId + "' is unrecognized."
                );
            }
        }
    }

    // Secured endpoints (requires Keycloak JWT token with write roles ideally)
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        validateProduct(product);
        ensureStandardVariant(product);
        if (product.getSlug() == null || product.getSlug().trim().isEmpty()) {
            generateSlug(product);
        }
        if (product.getListedRaw() == null) {
            product.setListed(false);
        }
        Product saved = productRepository.save(product);
        kafkaTemplate.send(TOPIC_UPSERT, saved.getId(), saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody Product product) {
        
        java.util.Optional<Product> existingOpt = productRepository.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Product existing = existingOpt.get();
        
        product.setId(id);
        validateProduct(product);
        ensureStandardVariant(product);
        
        // Track price history by variants now
        if (product.getVariants() != null) {
            for (ProductVariant newVar : product.getVariants()) {
                ProductVariant oldVar = null;
                if (existing.getVariants() != null) {
                    for (ProductVariant v : existing.getVariants()) {
                        if (v.getVariantId() != null && v.getVariantId().equals(newVar.getVariantId())) {
                            oldVar = v;
                            break;
                        }
                    }
                }
                
                java.math.BigDecimal oldP = oldVar != null ? oldVar.getPrice() : null;
                java.math.BigDecimal newP = newVar.getPrice();
                java.math.BigDecimal oldSP = oldVar != null ? oldVar.getSalePrice() : null;
                java.math.BigDecimal newSP = newVar.getSalePrice();
                
                boolean varPriceChanged = false;
                if (oldP == null && newP != null) varPriceChanged = true;
                else if (oldP != null && newP == null) varPriceChanged = true;
                else if (oldP != null && newP != null && oldP.compareTo(newP) != 0) varPriceChanged = true;
                
                if (oldSP == null && newSP != null) varPriceChanged = true;
                else if (oldSP != null && newSP == null) varPriceChanged = true;
                else if (oldSP != null && newSP != null && oldSP.compareTo(newSP) != 0) varPriceChanged = true;
                
                if (varPriceChanged) {
                    String updater = (email != null && !email.isEmpty()) ? email : "Admin";
                    PriceHistoryRecord record = new PriceHistoryRecord(oldP, newP, oldSP, newSP, updater);
                    java.util.List<PriceHistoryRecord> history = new java.util.ArrayList<>();
                    if (oldVar != null && oldVar.getPriceHistory() != null) {
                        history.addAll(oldVar.getPriceHistory());
                    }
                    history.add(record);
                    newVar.setPriceHistory(history);
                } else if (oldVar != null) {
                    newVar.setPriceHistory(oldVar.getPriceHistory());
                }
            }
        }
        
        // Safely copy editable catalog fields to preserve review data and price history list
        existing.setName(product.getName());
        existing.setDescription(product.getDescription());
        existing.setPrice(product.getPrice());
        existing.setSalePrice(product.getSalePrice());
        existing.setImages(product.getImages());
        existing.setBrand(product.getBrand());
        existing.setCategoryIds(product.getCategoryIds());
        existing.setFeatures(product.getFeatures());
        existing.setInStock(product.getInStock());
        existing.setAttributes(product.getAttributes());
        existing.setVariants(product.getVariants());
        existing.setGstPercentage(product.getGstPercentage());
        existing.setPromoted(product.getPromoted());
        existing.setPromotionPriority(product.getPromotionPriority());
        existing.setListed(product.getListed());
        
        if (product.getSlug() == null || product.getSlug().trim().isEmpty()) {
            generateSlug(existing);
        } else {
            existing.setSlug(product.getSlug());
        }
        
        Product updated = productRepository.save(existing);
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
            // Limit images to 5
            if (review.getImages() != null && review.getImages().size() > 5) {
                review.setImages(review.getImages().subList(0, 5));
            }
            
            com.gtstore.productservice.document.Review existingReview = null;
            if (product.getReviews() != null && review.getOrderId() != null) {
                for (com.gtstore.productservice.document.Review r : product.getReviews()) {
                    if (review.getOrderId().equals(r.getOrderId())) {
                        existingReview = r;
                        break;
                    }
                }
            }

            if (existingReview != null) {
                existingReview.setRating(review.getRating());
                existingReview.setComment(review.getComment());
                existingReview.setImages(review.getImages());
                existingReview.setDate(java.time.LocalDateTime.now());
                existingReview.setStatus("PENDING");
                review.setId(existingReview.getId()); // Use the same review ID for event payload
            } else {
                review.setDate(java.time.LocalDateTime.now());
                review.setUserName(name != null ? name : email);
                if (review.getId() == null) {
                    review.setId(java.util.UUID.randomUUID().toString());
                }
                review.setStatus("PENDING");
                if (product.getReviews() == null) {
                    product.setReviews(new java.util.ArrayList<>());
                }
                product.getReviews().add(review);
            }
            
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

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void migrateDatabaseOnStartup() {
        System.out.println("=== STARTING RAW MONGODB PRODUCTS MIGRATION ===");
        try {
            List<org.bson.Document> rawDocs = mongoTemplate.findAll(org.bson.Document.class, "products");
            int migrated = 0;
            for (org.bson.Document doc : rawDocs) {
                String id = doc.get("_id") != null ? doc.get("_id").toString() : null;
                if (id == null) continue;
                
                List<?> variantsList = (List<?>) doc.get("variants");
                boolean needsMigration = (variantsList == null || variantsList.isEmpty());
                
                if (needsMigration) {
                    System.out.println("Migrating product ID: " + id);
                    
                    org.bson.Document std = new org.bson.Document();
                    std.put("variantId", 1L);
                    std.put("name", "Standard");
                    std.put("grouping", "Option");
                    
                    std.put("price", doc.get("price"));
                    std.put("salePrice", doc.get("salePrice"));
                    
                    Object inStockVal = doc.get("inStock");
                    std.put("inStock", inStockVal != null ? inStockVal : true);
                    std.put("sequence", 0);
                    
                    Object rootHistory = doc.get("priceHistory");
                    std.put("priceHistory", rootHistory != null ? rootHistory : new java.util.ArrayList<>());
                    
                    List<org.bson.Document> newVariants = new java.util.ArrayList<>();
                    newVariants.add(std);
                    
                    org.springframework.data.mongodb.core.query.Query query = 
                        org.springframework.data.mongodb.core.query.Query.query(
                            org.springframework.data.mongodb.core.query.Criteria.where("_id").is(doc.get("_id"))
                        );
                    org.springframework.data.mongodb.core.query.Update update = 
                        new org.springframework.data.mongodb.core.query.Update()
                            .set("variants", newVariants)
                            .unset("price")
                            .unset("salePrice")
                            .unset("inStock")
                            .unset("priceHistory");
                            
                    mongoTemplate.updateFirst(query, update, "products");
                    migrated++;
                } else {
                    boolean updatedVariants = false;
                    List<org.bson.Document> updatedList = new java.util.ArrayList<>();
                    for (Object vObj : variantsList) {
                        if (vObj instanceof org.bson.Document) {
                            org.bson.Document vDoc = (org.bson.Document) vObj;
                            if (!vDoc.containsKey("sequence") || vDoc.get("sequence") == null) {
                                vDoc.put("sequence", 0);
                                updatedVariants = true;
                            }
                            if (!vDoc.containsKey("priceHistory") || vDoc.get("priceHistory") == null) {
                                vDoc.put("priceHistory", new java.util.ArrayList<>());
                                updatedVariants = true;
                            }
                            updatedList.add(vDoc);
                        }
                    }
                    if (updatedVariants || doc.containsKey("price") || doc.containsKey("salePrice") || doc.containsKey("inStock") || doc.containsKey("priceHistory")) {
                        org.springframework.data.mongodb.core.query.Query query = 
                            org.springframework.data.mongodb.core.query.Query.query(
                                org.springframework.data.mongodb.core.query.Criteria.where("_id").is(doc.get("_id"))
                            );
                        org.springframework.data.mongodb.core.query.Update update = 
                            new org.springframework.data.mongodb.core.query.Update()
                                .set("variants", updatedList)
                                .unset("price")
                                .unset("salePrice")
                                .unset("inStock")
                                .unset("priceHistory");
                        mongoTemplate.updateFirst(query, update, "products");
                        migrated++;
                    }
                }
            }
            System.out.println("=== RAW MONGODB PRODUCTS MIGRATION COMPLETED: " + migrated + " products updated ===");
        } catch (Exception e) {
            System.err.println("=== RAW MONGODB PRODUCTS MIGRATION FAILED: " + e.getMessage() + " ===");
            e.printStackTrace();
        }
    }

}

