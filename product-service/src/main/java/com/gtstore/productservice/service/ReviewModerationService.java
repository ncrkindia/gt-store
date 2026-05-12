package com.gtstore.productservice.service;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;
import java.util.List;
import java.util.Arrays;

@Service
public class ReviewModerationService {

    // Simple mock list for demonstration. In a real app, use an NLP library or external API.
    private static final List<String> FOUL_LANGUAGE = Arrays.asList(
        "fuck", "shit", "bitch", "asshole", "crap", "damn"
    );

    // Regex for basic confidential data (e.g., 16-digit credit cards, simple emails)
    private static final Pattern CREDIT_CARD_PATTERN = Pattern.compile("\\b(?:\\d[ -]*?){13,16}\\b");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b\\d{10}\\b");

    private static final List<String> SUSPICIOUS_WORDS = Arrays.asList(
        "broken", "terrible", "worst", "fraud", "scam", "fake"
    );

    /**
     * Analyzes the review content.
     * @param content the review text
     * @return status string: APPROVED, REJECTED, or NEEDS_REVIEW.
     */
    public String analyzeAndModerate(String content) {
        if (content == null || content.trim().isEmpty()) {
            return "APPROVED"; // Nothing to moderate
        }

        String lowerContent = content.toLowerCase();

        // 1. Check for Foul Language
        for (String word : FOUL_LANGUAGE) {
            if (lowerContent.contains(word)) {
                return "REJECTED";
            }
        }

        // 2. Check for Confidential Data
        if (CREDIT_CARD_PATTERN.matcher(content).find() ||
            EMAIL_PATTERN.matcher(content).find() ||
            PHONE_PATTERN.matcher(content).find()) {
            return "REJECTED";
        }

        // 3. Check for Suspicious Words that require manual review
        for (String word : SUSPICIOUS_WORDS) {
            if (lowerContent.contains(word)) {
                return "NEEDS_REVIEW";
            }
        }

        return "APPROVED";
    }
}
