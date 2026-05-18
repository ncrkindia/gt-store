package com.gtstore.invoiceservice.dto;

import java.math.BigDecimal;

public class OrderItemDto {
    private String productId;
    private int quantity;
    private BigDecimal price;
    private BigDecimal discountAmount;
    private BigDecimal loyaltyPointsUsed;
    
    // Virtual fields added by enrichers
    private String productName;
    private Integer gstPercentage = 18;

    public Integer getGstPercentage() { return gstPercentage != null ? gstPercentage : 18; }
    public void setGstPercentage(Integer gstPercentage) { this.gstPercentage = gstPercentage; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getDiscountAmount() { return discountAmount != null ? discountAmount : BigDecimal.ZERO; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getLoyaltyPointsUsed() { return loyaltyPointsUsed != null ? loyaltyPointsUsed : BigDecimal.ZERO; }
    public void setLoyaltyPointsUsed(BigDecimal loyaltyPointsUsed) { this.loyaltyPointsUsed = loyaltyPointsUsed; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
}
