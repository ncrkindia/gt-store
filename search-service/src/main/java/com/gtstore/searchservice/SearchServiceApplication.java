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
    }
}
