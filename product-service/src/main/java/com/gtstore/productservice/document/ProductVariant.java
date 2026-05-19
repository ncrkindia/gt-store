package com.gtstore.productservice.document;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;

public class ProductVariant {
    private Long variantId;
    private String name;
    private String grouping;
    private BigDecimal price;
    private BigDecimal salePrice;
    private List<String> images = new ArrayList<>();
    private List<String> features = new ArrayList<>();
    private Boolean inStock = true;
    private Integer sequence = 0;
    private List<PriceHistoryRecord> priceHistory = new ArrayList<>();

    public ProductVariant() {}

    public Long getVariantId() { return variantId; }
    public void setVariantId(Long variantId) { this.variantId = variantId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGrouping() { return grouping; }
    public void setGrouping(String grouping) { this.grouping = grouping; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }

    public Boolean getInStock() { return inStock != null ? inStock : true; }
    public void setInStock(Boolean inStock) { this.inStock = inStock; }

    public Integer getSequence() { return sequence != null ? sequence : 0; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }

    public List<PriceHistoryRecord> getPriceHistory() { return priceHistory != null ? priceHistory : new ArrayList<>(); }
    public void setPriceHistory(List<PriceHistoryRecord> priceHistory) { this.priceHistory = priceHistory; }
}
