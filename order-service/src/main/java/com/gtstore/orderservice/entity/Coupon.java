package com.gtstore.orderservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    // FIXED_CART, PERCENT_CART, FIXED_PRODUCT, PERCENT_PRODUCT
    @Column(name = "discount_type", nullable = false)
    private String discountType;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount_cap", precision = 10, scale = 2)
    private BigDecimal maxDiscountCap;

    @Column(name = "min_order_value", precision = 10, scale = 2)
    private BigDecimal minOrderValue;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    private Boolean active = true;

    // Rule A: Applicable on Single Product or Set of Products
    @Column(name = "applicable_product_ids", columnDefinition = "text")
    private String applicableProductIds; // Comma separated list of Product IDs

    // Rule A: Minimum Quantity from a set of Product
    @Column(name = "min_quantity")
    private Integer minQuantity;

    // Rule B, C, D: User Specific
    @Column(name = "applicable_user_ids", columnDefinition = "text")
    private String applicableUserIds; // Comma separated list of User Emails or IDs

    // Rule D: Fix value Against any Refund or Compensation
    @Column(name = "is_refund_compensation")
    private Boolean isRefundCompensation = false;

    @Column(name = "usage_policy", nullable = false)
    private String usagePolicy = "UNLIMITED"; // UNLIMITED, ONCE_LIFESPAN, ONCE_DAILY, ONCE_WEEKLY, ONCE_MONTHLY

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }
    public BigDecimal getMaxDiscountCap() { return maxDiscountCap; }
    public void setMaxDiscountCap(BigDecimal maxDiscountCap) { this.maxDiscountCap = maxDiscountCap; }
    public BigDecimal getMinOrderValue() { return minOrderValue; }
    public void setMinOrderValue(BigDecimal minOrderValue) { this.minOrderValue = minOrderValue; }
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getApplicableProductIds() { return applicableProductIds; }
    public void setApplicableProductIds(String applicableProductIds) { this.applicableProductIds = applicableProductIds; }
    public Integer getMinQuantity() { return minQuantity; }
    public void setMinQuantity(Integer minQuantity) { this.minQuantity = minQuantity; }
    public String getApplicableUserIds() { return applicableUserIds; }
    public void setApplicableUserIds(String applicableUserIds) { this.applicableUserIds = applicableUserIds; }
    public Boolean getIsRefundCompensation() { return isRefundCompensation; }
    public void setIsRefundCompensation(Boolean isRefundCompensation) { this.isRefundCompensation = isRefundCompensation; }
    public String getUsagePolicy() { return usagePolicy; }
    public void setUsagePolicy(String usagePolicy) { this.usagePolicy = usagePolicy; }
}
