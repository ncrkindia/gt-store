package com.gtstore.orderservice.dto;

import java.util.List;

public class CheckoutCalculationRequest {
    private List<OrderItemDto> items;
    private String couponCode;
    private java.math.BigDecimal loyaltyPointsToUse;

    public List<OrderItemDto> getItems() { return items; }
    public void setItems(List<OrderItemDto> items) { this.items = items; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public java.math.BigDecimal getLoyaltyPointsToUse() { return loyaltyPointsToUse; }
    public void setLoyaltyPointsToUse(java.math.BigDecimal loyaltyPointsToUse) { this.loyaltyPointsToUse = loyaltyPointsToUse; }
}
