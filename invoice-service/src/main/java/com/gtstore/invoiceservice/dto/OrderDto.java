package com.gtstore.invoiceservice.dto;

import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDateTime;

public class OrderDto {
    private String id;
    private String userId; // Represents customer email generally
    private String customerName;
    private String status;
    private BigDecimal totalAmount;
    private String paymentMethod;
    
    private String shippingLine1;
    private String shippingLine2;
    private String shippingCity;
    private String shippingState;
    private String shippingPincode;
    private String shippingCountry;
    private String customerPhone;
    private LocalDateTime createdAt;
    
    private String orderNumber;
    
    private String couponCode;
    private BigDecimal loyaltyPointsUsed;
    private BigDecimal discountAmount;
    private BigDecimal shippingCharge;
    private BigDecimal codCharge;
    
    private List<OrderItemDto> items;

    // Getters & Setters
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }

    public BigDecimal getLoyaltyPointsUsed() { return loyaltyPointsUsed != null ? loyaltyPointsUsed : BigDecimal.ZERO; }
    public void setLoyaltyPointsUsed(BigDecimal loyaltyPointsUsed) { this.loyaltyPointsUsed = loyaltyPointsUsed; }

    public BigDecimal getDiscountAmount() { return discountAmount != null ? discountAmount : BigDecimal.ZERO; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getShippingCharge() { return shippingCharge != null ? shippingCharge : BigDecimal.ZERO; }
    public void setShippingCharge(BigDecimal shippingCharge) { this.shippingCharge = shippingCharge; }

    public BigDecimal getCodCharge() { return codCharge != null ? codCharge : BigDecimal.ZERO; }
    public void setCodCharge(BigDecimal codCharge) { this.codCharge = codCharge; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<OrderItemDto> getItems() { return items; }
    public void setItems(List<OrderItemDto> items) { this.items = items; }
}
