package com.gtstore.orderservice.dto;

public class OrderItemDto {
    private String productId;
    private String variantId;
    private Integer quantity;
    private java.math.BigDecimal price;
    private java.math.BigDecimal discountAmount;
    private java.math.BigDecimal loyaltyPointsUsed;

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getVariantId() { return variantId; }
    public void setVariantId(String variantId) { this.variantId = variantId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public java.math.BigDecimal getPrice() { return price; }
    public void setPrice(java.math.BigDecimal price) { this.price = price; }
    public java.math.BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(java.math.BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public java.math.BigDecimal getLoyaltyPointsUsed() { return loyaltyPointsUsed; }
    public void setLoyaltyPointsUsed(java.math.BigDecimal loyaltyPointsUsed) { this.loyaltyPointsUsed = loyaltyPointsUsed; }
}
