package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.entity.SystemSetting;
import com.gtstore.orderservice.entity.SystemSettingHistory;
import com.gtstore.orderservice.repository.SystemSettingRepository;
import com.gtstore.orderservice.repository.SystemSettingHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders/settings")
public class SystemSettingController {

    @Autowired
    private SystemSettingRepository settingRepository;

    @Autowired
    private SystemSettingHistoryRepository historyRepository;

    @GetMapping
    public ResponseEntity<?> getSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("SHIPPING_RULES", settingRepository.findById("SHIPPING_RULES").map(SystemSetting::getValue).orElse("0-499:10,500+:0"));
        settings.put("COD_FIXED_CHARGE", settingRepository.findById("COD_FIXED_CHARGE").map(SystemSetting::getValue).orElse("5"));
        settings.put("LOYALTY_MAX_USAGE_PERCENT", settingRepository.findById("LOYALTY_MAX_USAGE_PERCENT").map(SystemSetting::getValue).orElse("20"));
        return ResponseEntity.ok(settings);
    }

    @PostMapping
    public ResponseEntity<?> updateSettings(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody Map<String, String> payload) {
        
        String updater = (email != null && !email.isEmpty()) ? email : "Admin";

        updateKeyWithHistory("SHIPPING_RULES", payload, updater, "0-499:10,500+:0");
        updateKeyWithHistory("COD_FIXED_CHARGE", payload, updater, "5");
        updateKeyWithHistory("LOYALTY_MAX_USAGE_PERCENT", payload, updater, "20");

        return ResponseEntity.ok().build();
    }

    @GetMapping("/history")
    public ResponseEntity<List<SystemSettingHistory>> getHistory() {
        return ResponseEntity.ok(historyRepository.findAllByOrderByUpdatedAtDesc());
    }

    private void updateKeyWithHistory(String key, Map<String, String> payload, String updater, String defaultVal) {
        if (payload.containsKey(key)) {
            String newValue = payload.get(key);
            String oldValue = settingRepository.findById(key).map(SystemSetting::getValue).orElse(defaultVal);
            
            if (!newValue.equals(oldValue)) {
                settingRepository.save(new SystemSetting(key, newValue));
                historyRepository.save(new SystemSettingHistory(key, oldValue, newValue, updater));
            }
        }
    }
}
