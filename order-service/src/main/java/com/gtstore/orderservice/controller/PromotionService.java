package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.dto.CheckoutCalculationRequest;
import com.gtstore.orderservice.dto.CheckoutCalculationResponse;
import com.gtstore.orderservice.dto.OrderItemDto;
import com.gtstore.orderservice.entity.Coupon;
import com.gtstore.orderservice.entity.Order;
import com.gtstore.orderservice.entity.SystemSetting;
import com.gtstore.orderservice.repository.CouponRepository;
import com.gtstore.orderservice.repository.OrderRepository;
import com.gtstore.orderservice.repository.SystemSettingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PromotionService {

    private static final Logger log = LoggerFactory.getLogger(PromotionService.class);

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SystemSettingRepository settingRepository;

    @Autowired
    private RestTemplate restTemplate;

    public CheckoutCalculationResponse calculateCheckout(CheckoutCalculationRequest request, String userId, boolean isCod) {
        CheckoutCalculationResponse response = new CheckoutCalculationResponse();
        List<CheckoutCalculationResponse.CalculatedItemDto> calcItems = new ArrayList<>();

        BigDecimal baseSubtotal = BigDecimal.ZERO;
        
        // 1. Fetch real prices and GST details from Product Service
        for (OrderItemDto itemReq : request.getItems()) {
            Map<String, Object> productMap = getProductFromService(itemReq.getProductId());
            BigDecimal price = null;
            Integer gstPercentage = 18; // default to 18% if missing
            if (productMap != null) {
                if (productMap.get("salePrice") != null) {
                    price = new BigDecimal(productMap.get("salePrice").toString());
                } else if (productMap.get("price") != null) {
                    price = new BigDecimal(productMap.get("price").toString());
                }
                if (productMap.get("gstPercentage") != null) {
                    try {
                        gstPercentage = Integer.parseInt(productMap.get("gstPercentage").toString());
                    } catch (Exception ignored) {}
                }
            }
            if (price == null) {
                price = itemReq.getPrice(); 
            }
            CheckoutCalculationResponse.CalculatedItemDto calcItem = new CheckoutCalculationResponse.CalculatedItemDto();
            calcItem.setProductId(itemReq.getProductId());
            calcItem.setQuantity(itemReq.getQuantity());
            calcItem.setOriginalPrice(price);
            calcItem.setDiscountedPrice(price); // Initial
            calcItem.setGstPercentage(gstPercentage);
            calcItems.add(calcItem);

            baseSubtotal = baseSubtotal.add(price.multiply(BigDecimal.valueOf(itemReq.getQuantity())));
        }

        response.setBaseSubtotal(baseSubtotal);

        // 2. Coupon Application
        BigDecimal productDiscounts = BigDecimal.ZERO;
        BigDecimal cartDiscounts = BigDecimal.ZERO;

        if (request.getCouponCode() != null && !request.getCouponCode().isEmpty()) {
            Optional<Coupon> couponOpt = couponRepository.findByCode(request.getCouponCode());
            if (couponOpt.isPresent()) {
                Coupon coupon = couponOpt.get();
                if (isCouponValid(coupon, userId, baseSubtotal, request.getItems())) {
                    if (coupon.getDiscountType().contains("PRODUCT")) {
                        // Apply to specific products
                        for (CheckoutCalculationResponse.CalculatedItemDto calcItem : calcItems) {
                            if (coupon.getApplicableProductIds() != null && coupon.getApplicableProductIds().contains(calcItem.getProductId())) {
                                BigDecimal discount = calculateDiscount(coupon, calcItem.getOriginalPrice().multiply(BigDecimal.valueOf(calcItem.getQuantity())));
                                calcItem.setDiscountedPrice(calcItem.getOriginalPrice().subtract(discount.divide(BigDecimal.valueOf(calcItem.getQuantity()), 2, RoundingMode.HALF_UP)));
                                productDiscounts = productDiscounts.add(discount);
                            }
                        }
                    } else if (coupon.getDiscountType().contains("CART")) {
                        cartDiscounts = calculateDiscount(coupon, baseSubtotal.subtract(productDiscounts));
                    }
                    response.setMessage("Coupon " + coupon.getCode() + " applied successfully.");
                } else {
                    response.setMessage("Coupon not valid for this order/user.");
                }
            } else {
                response.setMessage("Coupon not found.");
            }
        }

        response.setProductDiscounts(productDiscounts);
        BigDecimal subtotalAfterProdDiscounts = baseSubtotal.subtract(productDiscounts);
        response.setSubtotalAfterProductDiscounts(subtotalAfterProdDiscounts);

        response.setCartDiscounts(cartDiscounts);
        BigDecimal totalAfterCoupons = subtotalAfterProdDiscounts.subtract(cartDiscounts);
        response.setTotalAfterCoupons(totalAfterCoupons);

        // 3. Taxes: sum of individual items' inclusive GST on their discounted prices
        BigDecimal totalTaxes = BigDecimal.ZERO;
        for (CheckoutCalculationResponse.CalculatedItemDto calcItem : calcItems) {
            Integer pct = calcItem.getGstPercentage();
            BigDecimal gstRate = BigDecimal.valueOf(pct).divide(BigDecimal.valueOf(100));
            BigDecimal taxFactor = BigDecimal.ONE.add(gstRate);
            
            // Inclusive GST math: price / (1 + (pct/100))
            BigDecimal taxableUnit = calcItem.getDiscountedPrice().divide(taxFactor, 4, RoundingMode.HALF_UP);
            BigDecimal gstPerItem = calcItem.getDiscountedPrice().subtract(taxableUnit).setScale(2, RoundingMode.HALF_UP);
            BigDecimal itemTaxableAmount = taxableUnit.multiply(BigDecimal.valueOf(calcItem.getQuantity())).setScale(2, RoundingMode.HALF_UP);
            BigDecimal itemGstAmount = gstPerItem.multiply(BigDecimal.valueOf(calcItem.getQuantity())).setScale(2, RoundingMode.HALF_UP);
            
            calcItem.setTaxableAmount(itemTaxableAmount);
            calcItem.setGstAmount(itemGstAmount);
            
            totalTaxes = totalTaxes.add(itemGstAmount);
        }
        
        response.setTaxes(totalTaxes);
        BigDecimal totalWithTaxes = totalAfterCoupons; // Final prices are inclusive of GST! No tax added on top.

        // 4. Loyalty Points Usage (Rule B: max configured percent of cart value)
        BigDecimal pointsUsed = BigDecimal.ZERO;
        if (request.getLoyaltyPointsToUse() != null && request.getLoyaltyPointsToUse().compareTo(BigDecimal.ZERO) > 0) {
            String loyaltyMaxStr = settingRepository.findById("LOYALTY_MAX_USAGE_PERCENT").map(SystemSetting::getValue).orElse("20");
            BigDecimal loyaltyMaxPct = new BigDecimal(loyaltyMaxStr).divide(BigDecimal.valueOf(100));
            BigDecimal maxAllowedPoints = totalWithTaxes.multiply(loyaltyMaxPct);
            pointsUsed = request.getLoyaltyPointsToUse().min(maxAllowedPoints);
            // Must verify user has these points via user-service
            BigDecimal availablePoints = getUserLoyaltyPoints(userId);
            pointsUsed = pointsUsed.min(availablePoints);
        }
        response.setLoyaltyPointsUsed(pointsUsed);

        // 5. Shipping & COD
        String rulesStr = settingRepository.findById("SHIPPING_RULES").map(SystemSetting::getValue).orElse("0-499:10,500+:0");
        BigDecimal shipping = BigDecimal.ZERO;
        try {
            String[] rules = rulesStr.split(",");
            for (String rule : rules) {
                String[] parts = rule.trim().split(":");
                if (parts.length == 2) {
                    String range = parts[0].trim();
                    BigDecimal charge = new BigDecimal(parts[1].trim());
                    if (range.endsWith("+")) {
                        BigDecimal min = new BigDecimal(range.replace("+", "").trim());
                        if (totalWithTaxes.compareTo(min) >= 0) {
                            shipping = charge;
                            break;
                        }
                    } else {
                        String[] bounds = range.split("-");
                        if (bounds.length == 2) {
                            BigDecimal min = new BigDecimal(bounds[0].trim());
                            BigDecimal max = new BigDecimal(bounds[1].trim());
                            if (totalWithTaxes.compareTo(min) >= 0 && totalWithTaxes.compareTo(max) <= 0) {
                                shipping = charge;
                                break;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            shipping = totalWithTaxes.compareTo(BigDecimal.valueOf(50)) <= 0 && totalWithTaxes.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(10) : BigDecimal.ZERO;
        }
        response.setShippingCharge(shipping);

        String codStr = settingRepository.findById("COD_FIXED_CHARGE").map(SystemSetting::getValue).orElse("5");
        BigDecimal codCharge = BigDecimal.ZERO;
        try {
            codCharge = isCod ? new BigDecimal(codStr) : BigDecimal.ZERO;
        } catch (Exception e) {
            codCharge = isCod ? BigDecimal.valueOf(5) : BigDecimal.ZERO;
        }
        response.setCodCharge(codCharge);

        // 6. Final Payable
        BigDecimal finalPayable = totalWithTaxes.subtract(pointsUsed).add(shipping).add(codCharge);
        // Ensure not negative
        if (finalPayable.compareTo(BigDecimal.ZERO) < 0) finalPayable = BigDecimal.ZERO;
        
        response.setFinalPayable(finalPayable);

        // 7. Calculate Loyalty Points to be Earned (based on eligible amount after points redemption, matching the /earn algorithm)
        BigDecimal eligibleAmountForEarn = totalWithTaxes.subtract(pointsUsed);
        if (eligibleAmountForEarn.compareTo(BigDecimal.ZERO) < 0) eligibleAmountForEarn = BigDecimal.ZERO;
        String earnRateStr = settingRepository.findById("LOYALTY_EARN_RATE_PERCENT").map(SystemSetting::getValue).orElse("10");
        BigDecimal earnRate = new BigDecimal(earnRateStr);
        BigDecimal pointsToEarn = eligibleAmountForEarn.multiply(earnRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        response.setLoyaltyPointsToEarn(pointsToEarn);

        response.setItems(calcItems);

        return response;
    }

    private BigDecimal calculateDiscount(Coupon coupon, BigDecimal amount) {
        BigDecimal discount = BigDecimal.ZERO;
        if (coupon.getDiscountType().startsWith("PERCENT")) {
            discount = amount.multiply(coupon.getDiscountValue().divide(BigDecimal.valueOf(100)));
            if (coupon.getMaxDiscountCap() != null && discount.compareTo(coupon.getMaxDiscountCap()) > 0) {
                discount = coupon.getMaxDiscountCap();
            }
        } else if (coupon.getDiscountType().startsWith("FIXED")) {
            discount = coupon.getDiscountValue();
        }
        return discount.min(amount); // Cannot discount more than amount
    }

    private boolean isCouponValid(Coupon coupon, String userId, BigDecimal cartValue, List<OrderItemDto> items) {
        if (!coupon.getActive()) return false;
        LocalDateTime now = LocalDateTime.now();
        if (coupon.getStartDate() != null && now.isBefore(coupon.getStartDate())) return false;
        if (coupon.getExpiryDate() != null && now.isAfter(coupon.getExpiryDate())) return false;
        if (coupon.getMinOrderValue() != null && cartValue.compareTo(coupon.getMinOrderValue()) < 0) return false;
        
        // Rule B & C: User Specific check
        if (coupon.getApplicableUserIds() != null && !coupon.getApplicableUserIds().isEmpty()) {
            if (!coupon.getApplicableUserIds().contains(userId)) return false;
        }

        // Rule A: Min quantity
        if (coupon.getMinQuantity() != null && coupon.getMinQuantity() > 0) {
            int totalQty = items.stream()
                .filter(i -> coupon.getApplicableProductIds() == null || coupon.getApplicableProductIds().contains(i.getProductId()))
                .mapToInt(OrderItemDto::getQuantity)
                .sum();
            if (totalQty < coupon.getMinQuantity()) return false;
        }

        // User Usage Policy Check (Unlimited, Once in Lifespan, Once per Day, Once per Week, Once per Month)
        if (coupon.getUsagePolicy() != null && !coupon.getUsagePolicy().equalsIgnoreCase("UNLIMITED")) {
            String policy = coupon.getUsagePolicy().toUpperCase();
            if (policy.equals("ONCE_LIFESPAN")) {
                List<Order> orders = orderRepository.findByUserIdAndCouponCodeIgnoreCaseAndStatusNot(userId, coupon.getCode(), "CANCELLED");
                if (!orders.isEmpty()) return false;
            } else if (policy.equals("ONCE_DAILY")) {
                LocalDateTime since = LocalDateTime.now().minusDays(1);
                List<Order> orders = orderRepository.findByUserIdAndCouponCodeIgnoreCaseAndStatusNotAndCreatedAtAfter(userId, coupon.getCode(), "CANCELLED", since);
                if (!orders.isEmpty()) return false;
            } else if (policy.equals("ONCE_WEEKLY")) {
                LocalDateTime since = LocalDateTime.now().minusWeeks(1);
                List<Order> orders = orderRepository.findByUserIdAndCouponCodeIgnoreCaseAndStatusNotAndCreatedAtAfter(userId, coupon.getCode(), "CANCELLED", since);
                if (!orders.isEmpty()) return false;
            } else if (policy.equals("ONCE_MONTHLY")) {
                LocalDateTime since = LocalDateTime.now().minusMonths(1);
                List<Order> orders = orderRepository.findByUserIdAndCouponCodeIgnoreCaseAndStatusNotAndCreatedAtAfter(userId, coupon.getCode(), "CANCELLED", since);
                if (!orders.isEmpty()) return false;
            }
        }

        return true;
    }

    private Map<String, Object> getProductFromService(String productId) {
        try {
            String url = "http://product-service:4005/api/products/" + productId;
            return restTemplate.getForObject(url, Map.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            if (e.getStatusCode().value() == 404) {
                throw new IllegalArgumentException("Product is unlisted or unavailable: " + productId);
            }
            log.error("HTTP error fetching product " + productId, e);
        } catch (Exception e) {
            log.error("Could not fetch product " + productId, e);
        }
        return null;
    }

    private BigDecimal getUserLoyaltyPoints(String userId) {
        try {
            String url = "http://user-service:4004/api/users/profile";
            // Since we need header, it's better to use exchange
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-User-Email", userId);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<Map> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class);
            if (response.getBody() != null && response.getBody().get("loyaltyPoints") != null) {
                return new BigDecimal(response.getBody().get("loyaltyPoints").toString());
            }
        } catch (Exception e) {
            log.error("Could not fetch loyalty points for user " + userId, e);
        }
        return BigDecimal.ZERO;
    }
}
