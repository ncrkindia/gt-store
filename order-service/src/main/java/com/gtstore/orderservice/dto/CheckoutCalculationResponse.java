package com.gtstore.orderservice.dto;

import java.math.BigDecimal;
import java.util.List;

public class CheckoutCalculationResponse {
    private BigDecimal baseSubtotal;
    private BigDecimal productDiscounts;
    private BigDecimal subtotalAfterProductDiscounts;
    private BigDecimal cartDiscounts;
    private BigDecimal totalAfterCoupons;
    private BigDecimal taxes;
    private BigDecimal loyaltyPointsUsed;
    private BigDecimal shippingCharge;
    private BigDecimal codCharge;
    private BigDecimal finalPayable;
    private BigDecimal loyaltyPointsToEarn;
    private Boolean loyaltyProgramEnabled;
    private List<CalculatedItemDto> items;
    private String message;

    public static class CalculatedItemDto {
        private String productId;
        private Integer quantity;
        private BigDecimal originalPrice;
        private BigDecimal discountedPrice;
        private Integer gstPercentage;
        private BigDecimal gstAmount;
        private BigDecimal taxableAmount;
        private BigDecimal couponDiscountAmount;
        private BigDecimal loyaltyPointsUsed;
        private String productName;

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public BigDecimal getOriginalPrice() { return originalPrice; }
        public void setOriginalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; }
        public BigDecimal getDiscountedPrice() { return discountedPrice; }
        public void setDiscountedPrice(BigDecimal discountedPrice) { this.discountedPrice = discountedPrice; }
        public Integer getGstPercentage() { return gstPercentage; }
        public void setGstPercentage(Integer gstPercentage) { this.gstPercentage = gstPercentage; }
        public BigDecimal getGstAmount() { return gstAmount; }
        public void setGstAmount(BigDecimal gstAmount) { this.gstAmount = gstAmount; }
        public BigDecimal getTaxableAmount() { return taxableAmount; }
        public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }
        public BigDecimal getCouponDiscountAmount() { return couponDiscountAmount; }
        public void setCouponDiscountAmount(BigDecimal couponDiscountAmount) { this.couponDiscountAmount = couponDiscountAmount; }
        public BigDecimal getLoyaltyPointsUsed() { return loyaltyPointsUsed; }
        public void setLoyaltyPointsUsed(BigDecimal loyaltyPointsUsed) { this.loyaltyPointsUsed = loyaltyPointsUsed; }
    }

    public BigDecimal getBaseSubtotal() { return baseSubtotal; }
    public void setBaseSubtotal(BigDecimal baseSubtotal) { this.baseSubtotal = baseSubtotal; }
    public BigDecimal getProductDiscounts() { return productDiscounts; }
    public void setProductDiscounts(BigDecimal productDiscounts) { this.productDiscounts = productDiscounts; }
    public BigDecimal getSubtotalAfterProductDiscounts() { return subtotalAfterProductDiscounts; }
    public void setSubtotalAfterProductDiscounts(BigDecimal subtotalAfterProductDiscounts) { this.subtotalAfterProductDiscounts = subtotalAfterProductDiscounts; }
    public BigDecimal getCartDiscounts() { return cartDiscounts; }
    public void setCartDiscounts(BigDecimal cartDiscounts) { this.cartDiscounts = cartDiscounts; }
    public BigDecimal getTotalAfterCoupons() { return totalAfterCoupons; }
    public void setTotalAfterCoupons(BigDecimal totalAfterCoupons) { this.totalAfterCoupons = totalAfterCoupons; }
    public BigDecimal getTaxes() { return taxes; }
    public void setTaxes(BigDecimal taxes) { this.taxes = taxes; }
    public BigDecimal getLoyaltyPointsUsed() { return loyaltyPointsUsed; }
    public void setLoyaltyPointsUsed(BigDecimal loyaltyPointsUsed) { this.loyaltyPointsUsed = loyaltyPointsUsed; }
    public BigDecimal getShippingCharge() { return shippingCharge; }
    public void setShippingCharge(BigDecimal shippingCharge) { this.shippingCharge = shippingCharge; }
    public BigDecimal getCodCharge() { return codCharge; }
    public void setCodCharge(BigDecimal codCharge) { this.codCharge = codCharge; }
    public BigDecimal getFinalPayable() { return finalPayable; }
    public void setFinalPayable(BigDecimal finalPayable) { this.finalPayable = finalPayable; }
    public BigDecimal getLoyaltyPointsToEarn() { return loyaltyPointsToEarn; }
    public void setLoyaltyPointsToEarn(BigDecimal loyaltyPointsToEarn) { this.loyaltyPointsToEarn = loyaltyPointsToEarn; }
    public List<CalculatedItemDto> getItems() { return items; }
    public void setItems(List<CalculatedItemDto> items) { this.items = items; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getLoyaltyProgramEnabled() { return loyaltyProgramEnabled; }
    public void setLoyaltyProgramEnabled(Boolean loyaltyProgramEnabled) { this.loyaltyProgramEnabled = loyaltyProgramEnabled; }
}
