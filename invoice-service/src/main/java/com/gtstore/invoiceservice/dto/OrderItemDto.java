package com.gtstore.invoiceservice.dto;

import java.math.BigDecimal;

public class OrderItemDto {
    private String productId;
    private int quantity;
    private BigDecimal price;
    
    // Virtual fields added by enrichers
    private String productName;

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
}
