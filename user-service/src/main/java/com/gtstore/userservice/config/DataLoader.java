package com.gtstore.userservice.config;

import com.gtstore.userservice.entity.SystemSetting;
import com.gtstore.userservice.repository.SystemSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private SystemSettingRepository settingRepository;

    @Override
    public void run(String... args) throws Exception {
        if (!settingRepository.existsById("LOYALTY_EARN_RATE_PERCENT")) {
            settingRepository.save(new SystemSetting("LOYALTY_EARN_RATE_PERCENT", "10"));
        }
        if (!settingRepository.existsById("RETURN_PERIOD_DAYS")) {
            settingRepository.save(new SystemSetting("RETURN_PERIOD_DAYS", "15"));
        }
    }
}
