package com.gtstore.searchservice.controller;

import com.gtstore.searchservice.document.ProductDocument;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import co.elastic.clients.elasticsearch._types.FieldValue;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final ElasticsearchOperations elasticsearchOperations;

    public SearchController(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    @GetMapping
    public List<ProductDocument> search(@RequestParam String q) {
        // Enhanced search: Using bool query with multi-match and phrase-prefix for better discovery
        NativeQuery query = NativeQuery.builder()
                .withQuery(nq -> nq.bool(b -> b
                    .should(s -> s.multiMatch(m -> m
                        .fields("name^3", "description")
                        .query(q)
                        .fuzziness("AUTO")
                        .type(co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType.BestFields)))
                    .should(s -> s.matchPhrasePrefix(m -> m
                        .field("name")
                        .query(q)))
                ))
                .build();

        SearchHits<ProductDocument> hits = elasticsearchOperations.search(query, ProductDocument.class);
        return hits.stream().map(SearchHit::getContent).collect(Collectors.toList());
    }

    @GetMapping("/recommendations/product/{id}")
    public List<ProductDocument> getRecommendations(@PathVariable String id) {
        // Fetch current product to find its categories
        ProductDocument product = elasticsearchOperations.get(id, ProductDocument.class);
        if (product == null || product.getCategoryIds() == null || product.getCategoryIds().isEmpty()) {
            return List.of();
        }

        // Search for items in the same categories, excluding itself
        NativeQuery query = NativeQuery.builder()
                .withQuery(nq -> nq
                    .bool(b -> b
                        .must(m -> m.terms(t -> t
                            .field("categoryIds")
                            .terms(tt -> tt.value(product.getCategoryIds().stream().map(FieldValue::of).collect(Collectors.toList())))
                        ))
                        .mustNot(mn -> mn.ids(ids -> ids.values(id)))
                    )
                )
                .withMaxResults(5)
                .build();

        SearchHits<ProductDocument> hits = elasticsearchOperations.search(query, ProductDocument.class);
        return hits.stream().map(SearchHit::getContent).collect(Collectors.toList());
    }
}
