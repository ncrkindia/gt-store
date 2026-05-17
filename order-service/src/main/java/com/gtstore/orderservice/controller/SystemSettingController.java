package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.entity.SystemSetting;
import com.gtstore.orderservice.repository.SystemSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/orders/settings")
public class SystemSettingController {

    @Autowired
    private SystemSettingRepository settingRepository;

    @GetMapping
    public ResponseEntity<?> getSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("SHIPPING_RULES", settingRepository.findById("SHIPPING_RULES").map(SystemSetting::getValue).orElse("0-499:10,500+:0"));
        settings.put("COD_FIXED_CHARGE", settingRepository.findById("COD_FIXED_CHARGE").map(SystemSetting::getValue).orElse("5"));
        settings.put("LOYALTY_MAX_USAGE_PERCENT", settingRepository.findById("LOYALTY_MAX_USAGE_PERCENT").map(SystemSetting::getValue).orElse("20"));
        return ResponseEntity.ok(settings);
    }

    @PostMapping
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, String> payload) {
        if (payload.containsKey("SHIPPING_RULES")) {
            settingRepository.save(new SystemSetting("SHIPPING_RULES", payload.get("SHIPPING_RULES")));
        }
        if (payload.containsKey("COD_FIXED_CHARGE")) {
            settingRepository.save(new SystemSetting("COD_FIXED_CHARGE", payload.get("COD_FIXED_CHARGE")));
        }
        if (payload.containsKey("LOYALTY_MAX_USAGE_PERCENT")) {
            settingRepository.save(new SystemSetting("LOYALTY_MAX_USAGE_PERCENT", payload.get("LOYALTY_MAX_USAGE_PERCENT")));
        }
        return ResponseEntity.ok().build();
    }
}
