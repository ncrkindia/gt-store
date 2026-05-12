package com.gtstore.productservice.consumer;

import com.gtstore.productservice.document.Product;
import com.gtstore.productservice.document.Review;
import com.gtstore.productservice.repository.ProductRepository;
import com.gtstore.productservice.service.ReviewModerationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class ReviewEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(ReviewEventConsumer.class);
    private static final String TOPIC_UPSERT = "product.upserted";

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ReviewModerationService reviewModerationService;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "review.submitted", groupId = "product-service-group")
    public void consumeReviewSubmittedEvent(Map<String, String> payload) {
        String productId = payload.get("productId");
        String reviewId = payload.get("reviewId");

        if (productId == null || reviewId == null) {
            log.error("Invalid review.submitted payload: {}", payload);
            return;
        }

        log.info("Processing review submission async for product {} and review {}", productId, reviewId);

        Optional<Product> optionalProduct = productRepository.findById(productId);
        if (optionalProduct.isEmpty()) {
            log.error("Product not found: {}", productId);
            return;
        }

        Product product = optionalProduct.get();
        if (product.getReviews() == null) {
            log.warn("Product {} has no reviews to process", productId);
            return;
        }

        Review targetReview = null;
        for (Review r : product.getReviews()) {
            if (reviewId.equals(r.getId())) {
                targetReview = r;
                break;
            }
        }

        if (targetReview == null) {
            log.error("Review not found: {} for product {}", reviewId, productId);
            return;
        }

        // Run moderation
        String status = reviewModerationService.analyzeAndModerate(targetReview.getComment());
        targetReview.setStatus(status);
        log.info("Review {} moderated. Status: {}", reviewId, status);

        // Recalculate ratings based on APPROVED reviews only
        List<Review> approvedReviews = product.getReviews().stream()
                .filter(r -> "APPROVED".equals(r.getStatus()))
                .collect(Collectors.toList());

        if (!approvedReviews.isEmpty()) {
            int totalRatings = approvedReviews.stream().mapToInt(Review::getRating).sum();
            product.setReviewCount(approvedReviews.size());
            product.setRating((double) totalRatings / approvedReviews.size());

            java.util.Map<Integer, Integer> breakdown = new java.util.HashMap<>();
            for (Review r : approvedReviews) {
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
    }
}
