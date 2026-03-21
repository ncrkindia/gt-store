package com.gtstore.cartservice.model;

public class CartItem {

    private String productId;
    
    // Optional variant e.g., size or color
    private String variantId;
    
    private Integer quantity;

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getVariantId() { return variantId; }
    public void setVariantId(String variantId) { this.variantId = variantId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
