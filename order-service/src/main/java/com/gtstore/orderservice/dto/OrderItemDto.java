package com.gtstore.orderservice.dto;

public class OrderItemDto {
    private String productId;
    private String variantId;
    private Integer quantity;
    private java.math.BigDecimal price;

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getVariantId() { return variantId; }
    public void setVariantId(String variantId) { this.variantId = variantId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public java.math.BigDecimal getPrice() { return price; }
    public void setPrice(java.math.BigDecimal price) { this.price = price; }
}
