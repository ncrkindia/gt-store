package com.gtstore.searchservice.listener;

import com.gtstore.searchservice.document.ProductDocument;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class ProductEventListener {

    private static final Logger log = LoggerFactory.getLogger(ProductEventListener.class);
    private final ElasticsearchOperations elasticsearchOperations;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public ProductEventListener(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    @KafkaListener(topics = "product.upserted", groupId = "search-group")
    public void handleProductUpsert(String productJson) {
        try {
            com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(productJson);
            ProductDocument doc = new ProductDocument();
            doc.setId(node.get("id").asText());
            doc.setName(node.get("name").asText());
            doc.setDescription(node.get("description").asText());
            doc.setPrice(new java.math.BigDecimal(node.get("price").asText()));
            doc.setBrand(node.has("brand") ? node.get("brand").asText() : null);
            
            if (node.has("categoryIds")) {
                java.util.List<String> categories = new java.util.ArrayList<>();
                node.get("categoryIds").forEach(c -> categories.add(c.asText()));
                doc.setCategoryIds(categories);
            }

            if (node.has("images") && node.get("images").isArray() && node.get("images").size() > 0) {
                doc.setImageUrl(node.get("images").get(0).asText());
            }

            elasticsearchOperations.save(doc);
            log.info("Indexed product in Elasticsearch: {}", doc.getId());
        } catch (Exception e) {
            log.error("Failed to index product upsert. Payload: {}", productJson, e);
        }
    }


    @KafkaListener(topics = "product.deleted", groupId = "search-group")
    public void handleProductDelete(String productId) {
        try {
            // Strip quotes if any from Kafka message
            String id = productId.replace("\"", "");
            elasticsearchOperations.delete(id, ProductDocument.class);
            log.info("Deleted product from Elasticsearch index: {}", id);
        } catch (Exception e) {
            log.error("Failed to delete product from index", e);
        }
    }
}
