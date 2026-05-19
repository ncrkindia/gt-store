package com.gtstore.productservice.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Product document representing an item in the GT Store catalog.
 * Stored in MongoDB to allow for flexible attributes and metadata.
 * Features text indexing on 'name' and 'description' for efficient search.
 */
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    @TextIndexed
    private String name;

    private String slug;

    @TextIndexed
    private String description;

    @org.springframework.data.annotation.Transient
    private BigDecimal price;
    @org.springframework.data.annotation.Transient
    private BigDecimal salePrice;

    private List<String> images;
    
    private String brand;
    
    private List<String> categoryIds;
    
    private Double rating;
    private Integer reviewCount;

    private List<String> features;
    @org.springframework.data.annotation.Transient
    private Boolean inStock;

    // e.g. "Color": ["Red", "Blue"], "Size": ["M", "L"]
    private Map<String, List<String>> attributes;
    
    private Integer gstPercentage = 18; // Default 18% tax

    
    private List<Review> reviews = new java.util.ArrayList<>();
    
    
    /**
     * Flag indicating whether this product is featured in the Storefront Homepage 'Promoted Picks' section.
     * If true, this product receives priority rendering across global catalog queries.
     */
    private Boolean promoted = false;

    /**
     * Sorting score for the promotion hierarchy. High priority values (e.g., 100) place
     * the product higher in the catalog sorting array compared to lower values.
     */
    private Integer promotionPriority = 0;

    private Boolean listed;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPrice() {
        if (variants != null && !variants.isEmpty()) {
            return variants.stream()
                    .min(java.util.Comparator.comparingInt(v -> v.getSequence() != null ? v.getSequence() : 0))
                    .map(ProductVariant::getPrice)
                    .orElse(price);
        }
        return price;
    }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() {
        if (variants != null && !variants.isEmpty()) {
            return variants.stream()
                    .min(java.util.Comparator.comparingInt(v -> v.getSequence() != null ? v.getSequence() : 0))
                    .map(ProductVariant::getSalePrice)
                    .orElse(salePrice);
        }
        return salePrice;
    }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public List<String> getCategoryIds() { return categoryIds; }
    public void setCategoryIds(List<String> categoryIds) { this.categoryIds = categoryIds; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }
    public Map<String, List<String>> getAttributes() { return attributes; }
    public void setAttributes(Map<String, List<String>> attributes) { this.attributes = attributes; }
    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }
    public Boolean getInStock() {
        if (variants != null && !variants.isEmpty()) {
            return variants.stream()
                    .min(java.util.Comparator.comparingInt(v -> v.getSequence() != null ? v.getSequence() : 0))
                    .map(ProductVariant::getInStock)
                    .orElse(inStock);
        }
        return inStock;
    }
    public void setInStock(Boolean inStock) { this.inStock = inStock; }
    public List<Review> getReviews() { return reviews; }
    public void setReviews(List<Review> reviews) { this.reviews = reviews; }
    
    public Boolean getPromoted() { return promoted != null ? promoted : false; }
    public void setPromoted(Boolean promoted) { this.promoted = promoted; }
    public Integer getPromotionPriority() { return promotionPriority != null ? promotionPriority : 0; }
    public void setPromotionPriority(Integer promotionPriority) { this.promotionPriority = promotionPriority; }

    public Integer getGstPercentage() { 
        return (gstPercentage != null) ? gstPercentage : 18; 
    }
    public void setGstPercentage(Integer gstPercentage) { 
        this.gstPercentage = gstPercentage; 
    }

    public Boolean getListed() {
        return listed != null ? listed : true;
    }
    public void setListed(Boolean listed) {
        this.listed = listed;
    }
    public Boolean getListedRaw() {
        return listed;
    }

    private Map<Integer, Integer> ratingBreakdown = new java.util.HashMap<>();
    public Map<Integer, Integer> getRatingBreakdown() { return ratingBreakdown; }
    public void setRatingBreakdown(Map<Integer, Integer> ratingBreakdown) { this.ratingBreakdown = ratingBreakdown; }



    private List<ProductVariant> variants = new java.util.ArrayList<>();
    public List<ProductVariant> getVariants() {
        return variants != null ? variants : new java.util.ArrayList<>();
    }
    public void setVariants(List<ProductVariant> variants) {
        this.variants = variants;
    }
}
