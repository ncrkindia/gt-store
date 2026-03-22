package com.gtstore.notificationservice.dto;

import java.util.List;

public class OrderEvent {
    private String orderId;
    private String status;
    private String email;
    private String fullName;
    private List<OrderItemDto> items;

    public OrderEvent() {}

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public List<OrderItemDto> getItems() { return items; }
    public void setItems(List<OrderItemDto> items) { this.items = items; }
}

class OrderItemDto {
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
