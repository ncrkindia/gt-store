package com.gtstore.inventoryservice.dto;

public class OrderItemDto {
    private String productId;
    private String variantId;
    private Integer quantity;

    public OrderItemDto() {}

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getVariantId() { return variantId; }
    public void setVariantId(String variantId) { this.variantId = variantId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
