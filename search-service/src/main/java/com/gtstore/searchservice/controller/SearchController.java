package com.gtstore.searchservice.controller;

import com.gtstore.searchservice.document.ProductDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final ElasticsearchOperations elasticsearchOperations;

    @Autowired
    private RestTemplate restTemplate;

    public SearchController(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    /**
     * Full-text search across: name (boosted), brand, description, features,
     * categoryIds.
     * Supports fuzzy matching + phrase-prefix for instant autocomplete feel.
     * GET /api/search?q=<query>&size=20
     */
    @GetMapping
    public List<ProductDocument> search(@RequestParam String q, @RequestParam(defaultValue = "10") int size) {
        NativeQuery query = NativeQuery.builder()
                .withQuery(nq -> nq.bool(b -> b
                        // Primary: multi-field fuzzy match
                        .should(s -> s.multiMatch(m -> m
                                .fields("name^4", "brand^3", "description^1", "features^2")
                                .query(q)
                                .fuzziness("AUTO")
                                .type(co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType.BestFields)))
                        // Secondary: phrase prefix for name autocomplete-like matching
                        .should(s -> s.matchPhrasePrefix(m -> m
                                .field("name")
                                .query(q)
                                .boost(3.0f)))
                        // Brand prefix — Keyword field must use prefix query not matchPhrasePrefix
                        .should(s -> s.prefix(p -> p
                                .field("brand")
                                .value(q.toLowerCase())
                                .boost(2.0f)))
                        // Category keyword match
                        .should(s -> s.term(t -> t
                                .field("categoryIds")
                                .value(q.toLowerCase())))
                        .minimumShouldMatch("1")))
                .withMaxResults(size)
                .build();

        SearchHits<ProductDocument> hits = elasticsearchOperations.search(query, ProductDocument.class);
        return hits.get().map(SearchHit::getContent).collect(Collectors.toList());
    }

    /**
     * Live search suggestions (Typeahead).
     * Minimal data returned, optimized for high-frequency keystrokes.
     */
    @GetMapping("/suggest")
    public List<Map<String, String>> suggest(@RequestParam String q) {
        NativeQuery query = NativeQuery.builder()
                .withQuery(nq -> nq.bool(b -> b
                        .should(s -> s.matchPhrasePrefix(m -> m.field("name").query(q).boost(3.0f)))
                        .should(s -> s.prefix(p -> p.field("brand").value(q.toLowerCase()).boost(2.0f)))
                        .minimumShouldMatch("1")))
                .withMaxResults(6)
                .build();

        SearchHits<ProductDocument> hits = elasticsearchOperations.search(query, ProductDocument.class);
        return hits.get().map(hit -> {
            ProductDocument doc = hit.getContent();
            return Map.of(
                    "id", doc.getId(),
                    "name", doc.getName(),
                    "brand", doc.getBrand() != null ? doc.getBrand() : "");
        }).collect(Collectors.toList());
    }

    /**
     * Pull-based synchronization from product-service.
     * Bypasses 401 issues on Kafka-trigger by using the public GET API.
     */
    @PostMapping("/sync-all")
    public Map<String, Object> syncAll() {
        String productServiceUrl = "http://product-service:4005/api/products?size=1000";
        try {
            Map<?, ?> response = restTemplate.getForObject(productServiceUrl, Map.class);
            if (response != null && response.get("content") instanceof List) {
                List<Map<String, Object>> products = (List<Map<String, Object>>) response.get("content");
                
                List<ProductDocument> documents = products.stream().map(p -> {
                    ProductDocument doc = new ProductDocument();
                    doc.setId((String) p.get("id"));
                    doc.setName((String) p.get("name"));
                    doc.setDescription((String) p.get("description"));
                    doc.setBrand((String) p.get("brand"));
                    doc.setCategoryIds((List<String>) p.get("categoryIds"));
                    
                    // Handle image URL extraction from list
                    List<String> images = (List<String>) p.get("images");
                    if (images != null && !images.isEmpty()) {
                        doc.setImageUrl(images.get(0));
                    }
                    
                    doc.setPrice(p.get("price") != null ? new BigDecimal(p.get("price").toString()) : null);
                    doc.setSalePrice(p.get("salePrice") != null ? new BigDecimal(p.get("salePrice").toString()) : null);
                    doc.setRating(p.get("rating") != null ? ((Number) p.get("rating")).doubleValue() : null);
                    doc.setReviewCount(p.get("reviewCount") != null ? ((Number) p.get("reviewCount")).intValue() : null);
                    doc.setFeatures((List<String>) p.get("features"));
                    doc.setInStock((Boolean) p.get("inStock"));
                    return doc;
                }).collect(Collectors.toList());

                elasticsearchOperations.save(documents);
                return Map.of("status", "success", "syncedCount", documents.size());
            }
            return Map.of("status", "error", "message", "Empty response from product-service");
        } catch (Exception e) {
            return Map.of("status", "error", "message", e.getMessage());
        }
    }
}
