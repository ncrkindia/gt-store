package com.gtstore.notificationservice.dto;

import java.util.List;

public class OrderEvent {
    private String orderId;
    private String status;
    private String email;
    private String fullName;
    private String paymentMethod;
    private String shippingLine1;
    private String shippingLine2;
    private String shippingCity;
    private String shippingState;
    private String shippingPincode;
    private String shippingCountry;
    private String customerPhone;
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
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getShippingLine1() { return shippingLine1; }
    public void setShippingLine1(String shippingLine1) { this.shippingLine1 = shippingLine1; }
    public String getShippingLine2() { return shippingLine2; }
    public void setShippingLine2(String shippingLine2) { this.shippingLine2 = shippingLine2; }
    public String getShippingCity() { return shippingCity; }
    public void setShippingCity(String shippingCity) { this.shippingCity = shippingCity; }
    public String getShippingState() { return shippingState; }
    public void setShippingState(String shippingState) { this.shippingState = shippingState; }
    public String getShippingPincode() { return shippingPincode; }
    public void setShippingPincode(String shippingPincode) { this.shippingPincode = shippingPincode; }
    public String getShippingCountry() { return shippingCountry; }
    public void setShippingCountry(String shippingCountry) { this.shippingCountry = shippingCountry; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
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
