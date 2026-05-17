package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.entity.Coupon;
import com.gtstore.orderservice.repository.CouponRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders/coupons")
public class CouponController {

    @Autowired
    private CouponRepository couponRepository;

    @GetMapping
    public ResponseEntity<List<Coupon>> getAllCoupons() {
        return ResponseEntity.ok(couponRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Coupon> getCouponById(@PathVariable Long id) {
        return couponRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private String generateUniqueRefundCouponCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        do {
            StringBuilder sb = new StringBuilder("TA");
            for (int i = 0; i < 14; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (couponRepository.findByCode(code).isPresent());
        return code;
    }

    @PostMapping
    public ResponseEntity<?> createCoupon(@RequestBody Coupon coupon) {
        if (coupon.getIsRefundCompensation() != null && coupon.getIsRefundCompensation()) {
            if (coupon.getApplicableUserIds() == null || coupon.getApplicableUserIds().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Store Refund/Compensation coupons must have at least one applicable user specified");
            }
            coupon.setCode(generateUniqueRefundCouponCode());
            coupon.setUsagePolicy("ONCE_LIFESPAN");
        } else {
            if (coupon.getCode() == null || coupon.getCode().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Coupon code is required");
            }
            if (couponRepository.findByCode(coupon.getCode().trim().toUpperCase()).isPresent()) {
                return ResponseEntity.badRequest().body("Coupon code already exists");
            }
            coupon.setCode(coupon.getCode().trim().toUpperCase());
        }
        Coupon saved = couponRepository.save(coupon);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCoupon(@PathVariable Long id, @RequestBody Coupon couponDetails) {
        Optional<Coupon> couponOpt = couponRepository.findById(id);
        if (couponOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Coupon coupon = couponOpt.get();
        couponDetails.setId(id);
        
        // Make Refund Coupon as Non Editable (can only be Disabled after creation)
        if (coupon.getIsRefundCompensation() != null && coupon.getIsRefundCompensation()) {
            coupon.setActive(couponDetails.getActive());
            Coupon updated = couponRepository.save(coupon);
            return ResponseEntity.ok(updated);
        }
        
        coupon.setIsRefundCompensation(couponDetails.getIsRefundCompensation());
        
        if (coupon.getIsRefundCompensation() != null && coupon.getIsRefundCompensation()) {
            if (coupon.getCode() == null || !coupon.getCode().startsWith("TA") || coupon.getCode().length() != 16) {
                coupon.setCode(generateUniqueRefundCouponCode());
            }
        } else {
            if (couponDetails.getCode() != null) {
                coupon.setCode(couponDetails.getCode().trim().toUpperCase());
            }
        }
        coupon.setDiscountType(couponDetails.getDiscountType());
        coupon.setDiscountValue(couponDetails.getDiscountValue());
        coupon.setMaxDiscountCap(couponDetails.getMaxDiscountCap());
        coupon.setMinOrderValue(couponDetails.getMinOrderValue());
        coupon.setStartDate(couponDetails.getStartDate());
        coupon.setExpiryDate(couponDetails.getExpiryDate());
        coupon.setActive(couponDetails.getActive());
        coupon.setApplicableProductIds(couponDetails.getApplicableProductIds());
        coupon.setMinQuantity(couponDetails.getMinQuantity());
        coupon.setApplicableUserIds(couponDetails.getApplicableUserIds());
        if (couponDetails.getUsagePolicy() != null) {
            coupon.setUsagePolicy(couponDetails.getUsagePolicy());
        }

        Coupon updated = couponRepository.save(coupon);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCoupon(@PathVariable Long id) {
        return couponRepository.findById(id)
                .map(coupon -> {
                    couponRepository.delete(coupon);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
