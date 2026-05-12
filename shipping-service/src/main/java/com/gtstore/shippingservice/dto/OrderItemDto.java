package com.gtstore.shippingservice.dto;

public class OrderItemDto {
    private String productId;
    private String variantId;
    private int quantity;

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getVariantId() { return variantId; }
    public void setVariantId(String variantId) { this.variantId = variantId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}
