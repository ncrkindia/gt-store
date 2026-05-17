package com.gtstore.userservice.controller;

import com.gtstore.userservice.entity.LoyaltyPointHistory;
import com.gtstore.userservice.entity.SystemSetting;
import com.gtstore.userservice.entity.User;
import com.gtstore.userservice.repository.LoyaltyPointHistoryRepository;
import com.gtstore.userservice.repository.SystemSettingRepository;
import com.gtstore.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users/loyalty")
public class LoyaltyController {

    @Autowired
    private LoyaltyPointHistoryRepository historyRepository;

    @Autowired
    private SystemSettingRepository settingRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/history")
    public ResponseEntity<?> getLoyaltyHistory(@RequestHeader(value = "X-User-Email", required = false) String email) {
        if (email == null) return ResponseEntity.status(401).build();
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();

        List<LoyaltyPointHistory> history = historyRepository.findByEmailOrderByCreatedAtDesc(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("availablePoints", userOpt.get().getLoyaltyPoints());
        response.put("history", history);
        
        return ResponseEntity.ok(response);
    }

    // Called internally by Order Service
    @PostMapping("/earn")
    public ResponseEntity<?> earnPoints(@RequestBody Map<String, Object> request) {
        String email = (String) request.get("email");
        String orderId = (String) request.get("orderId");
        BigDecimal totalAmount = new BigDecimal(request.get("totalAmount").toString());
        BigDecimal shippingCharge = new BigDecimal(request.get("shippingCharge").toString());
        BigDecimal codCharge = new BigDecimal(request.get("codCharge").toString());

        BigDecimal eligibleAmount = totalAmount.subtract(shippingCharge).subtract(codCharge);
        if (eligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.ok().build();
        }

        // Get Configurable values
        BigDecimal earnRate = new BigDecimal(settingRepository.findById("LOYALTY_EARN_RATE_PERCENT").map(SystemSetting::getValue).orElse("10"));
        int returnPeriodDays = Integer.parseInt(settingRepository.findById("RETURN_PERIOD_DAYS").map(SystemSetting::getValue).orElse("15"));

        BigDecimal pointsEarned = eligibleAmount.multiply(earnRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        if (pointsEarned.compareTo(BigDecimal.ZERO) > 0) {
            LoyaltyPointHistory history = new LoyaltyPointHistory();
            history.setEmail(email);
            history.setOrderId(orderId);
            history.setPoints(pointsEarned);
            history.setTransactionType("EARNED");
            history.setStatus("PENDING");
            history.setAvailableAt(LocalDateTime.now().plusDays(returnPeriodDays));
            history.setDescription("Points will be available after " + returnPeriodDays + " Days of Delivery (Earned on Order #" + orderId + ")");
            
            historyRepository.save(history);
        }

        return ResponseEntity.ok().build();
    }

    // To be called internally by Order Service when points are redeemed
    @PostMapping("/redeem")
    public ResponseEntity<?> redeemPoints(@RequestBody Map<String, Object> request) {
        String email = (String) request.get("email");
        String orderId = (String) request.get("orderId");
        BigDecimal pointsToUse = new BigDecimal(request.get("pointsUsed").toString());

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getLoyaltyPoints().compareTo(pointsToUse) >= 0) {
                user.setLoyaltyPoints(user.getLoyaltyPoints().subtract(pointsToUse));
                userRepository.save(user);

                LoyaltyPointHistory history = new LoyaltyPointHistory();
                history.setEmail(email);
                history.setOrderId(orderId);
                history.setPoints(pointsToUse);
                history.setTransactionType("REDEEMED");
                history.setStatus("AVAILABLE");
                history.setDescription("Redeemed points for Order #" + orderId);
                historyRepository.save(history);
            }
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("LOYALTY_EARN_RATE_PERCENT", settingRepository.findById("LOYALTY_EARN_RATE_PERCENT").map(SystemSetting::getValue).orElse("10"));
        settings.put("RETURN_PERIOD_DAYS", settingRepository.findById("RETURN_PERIOD_DAYS").map(SystemSetting::getValue).orElse("15"));
        return ResponseEntity.ok(settings);
    }

    @PostMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, String> payload) {
        if (payload.containsKey("LOYALTY_EARN_RATE_PERCENT")) {
            settingRepository.save(new SystemSetting("LOYALTY_EARN_RATE_PERCENT", payload.get("LOYALTY_EARN_RATE_PERCENT")));
        }
        if (payload.containsKey("RETURN_PERIOD_DAYS")) {
            settingRepository.save(new SystemSetting("RETURN_PERIOD_DAYS", payload.get("RETURN_PERIOD_DAYS")));
        }
        return ResponseEntity.ok().build();
    }
}
