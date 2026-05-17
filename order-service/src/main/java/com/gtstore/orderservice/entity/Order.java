package com.gtstore.orderservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_number", unique = true, length = 10)
    private String orderNumber;

    @Column(name = "user_id", nullable = false)
    private String userId; // User Email from Gateway

    @Column(nullable = false)
    private String status; // PENDING, PAID, SHIPPED, DELIVERED, CANCELLED

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "shipping_address_id")
    private Long shippingAddressId;

    @Column(name = "payment_method")
    private String paymentMethod; // COD, ONLINE

    @Column(name = "shipping_line_1")
    private String shippingLine1;

    @Column(name = "shipping_line_2")
    private String shippingLine2;

    @Column(name = "shipping_city")
    private String shippingCity;

    @Column(name = "shipping_state")
    private String shippingState;

    @Column(name = "shipping_pincode")
    private String shippingPincode;

    @Column(name = "shipping_country")
    private String shippingCountry;

    @Column(name = "customer_phone")
    private String customerPhone;
    
    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "coupon_code")
    private String couponCode;

    @Column(name = "loyalty_points_used", precision = 10, scale = 2)
    private BigDecimal loyaltyPointsUsed;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "tax_amount", precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "shipping_charge", precision = 10, scale = 2)
    private BigDecimal shippingCharge;

    @Column(name = "cod_charge", precision = 10, scale = 2)
    private BigDecimal codCharge;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    private List<OrderAudit> audits = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }
    
    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }

    public void addAudit(OrderAudit audit) {
        audits.add(audit);
        audit.setOrder(this);
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public Long getShippingAddressId() { return shippingAddressId; }
    public void setShippingAddressId(Long shippingAddressId) { this.shippingAddressId = shippingAddressId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
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
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }

    public List<OrderAudit> getAudits() { return audits; }
    public void setAudits(List<OrderAudit> audits) { this.audits = audits; }

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public BigDecimal getLoyaltyPointsUsed() { return loyaltyPointsUsed; }
    public void setLoyaltyPointsUsed(BigDecimal loyaltyPointsUsed) { this.loyaltyPointsUsed = loyaltyPointsUsed; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public BigDecimal getShippingCharge() { return shippingCharge; }
    public void setShippingCharge(BigDecimal shippingCharge) { this.shippingCharge = shippingCharge; }
    public BigDecimal getCodCharge() { return codCharge; }
    public void setCodCharge(BigDecimal codCharge) { this.codCharge = codCharge; }
}
