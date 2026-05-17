package com.gtstore.searchservice;

import com.gtstore.searchservice.document.ProductDocument;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;

@SpringBootApplication
public class SearchServiceApplication {
    private final ElasticsearchOperations elasticsearchOperations;

    public SearchServiceApplication(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.web.client.RestTemplate restTemplate() {
        return new org.springframework.web.client.RestTemplate();
    }

    public static void main(String[] args) {
        SpringApplication.run(SearchServiceApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void createIndexIfNotExists() {
        IndexOperations indexOps = elasticsearchOperations.indexOps(ProductDocument.class);
        if (!indexOps.exists()) {
            indexOps.createWithMapping();
        }

        // Trigger background self-healing sync with retries in case product-service is starting up
        new Thread(() -> {
            int retries = 12;
            int delayMs = 10000;
            org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SearchServiceApplication.class);
            org.springframework.web.client.RestTemplate rest = restTemplate();
            
            for (int i = 1; i <= retries; i++) {
                try {
                    log.info("Self-Healing Catalog Sync [Attempt {}/{}]: Contacting product-service...", i, retries);
                    String url = "http://product-service:4005/api/products?size=1000&includeUnlisted=true";
                    java.util.Map<?, ?> response = rest.getForObject(url, java.util.Map.class);
                    if (response != null && response.get("content") instanceof java.util.List) {
                        java.util.List<java.util.Map<String, Object>> products = (java.util.List<java.util.Map<String, Object>>) response.get("content");
                        
                        java.util.List<ProductDocument> documents = products.stream().map(p -> {
                            ProductDocument doc = new ProductDocument();
                            doc.setId((String) p.get("id"));
                            doc.setName((String) p.get("name"));
                            doc.setSlug((String) p.get("slug"));
                            doc.setDescription((String) p.get("description"));
                            doc.setBrand((String) p.get("brand"));
                            doc.setCategoryIds((java.util.List<String>) p.get("categoryIds"));
                            
                            java.util.List<String> images = (java.util.List<String>) p.get("images");
                            if (images != null && !images.isEmpty()) {
                                doc.setImageUrl(images.get(0));
                            }
                            
                            doc.setPrice(p.get("price") != null ? new java.math.BigDecimal(p.get("price").toString()) : null);
                            doc.setSalePrice(p.get("salePrice") != null ? new java.math.BigDecimal(p.get("salePrice").toString()) : null);
                            doc.setRating(p.get("rating") != null ? ((Number) p.get("rating")).doubleValue() : null);
                            doc.setReviewCount(p.get("reviewCount") != null ? ((Number) p.get("reviewCount")).intValue() : null);
                            doc.setFeatures((java.util.List<String>) p.get("features"));
                            doc.setInStock((Boolean) p.get("inStock"));
                            doc.setListed(p.get("listed") != null ? (Boolean) p.get("listed") : true);
                            return doc;
                        }).collect(java.util.stream.Collectors.toList());

                        elasticsearchOperations.save(documents);
                        log.info("Self-Healing Catalog Sync: Successfully indexed {} products to Elasticsearch.", documents.size());
                        break;
                    } else {
                        log.warn("Self-Healing Catalog Sync [Attempt {}/{}]: Empty or invalid response.", i, retries);
                    }
                } catch (Exception e) {
                    log.warn("Self-Healing Catalog Sync [Attempt {}/{}]: product-service unavailable ({}). Retrying in {}ms...", i, retries, e.getMessage(), delayMs);
                }
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "elasticsearch-startup-sync").start();
    }
}
