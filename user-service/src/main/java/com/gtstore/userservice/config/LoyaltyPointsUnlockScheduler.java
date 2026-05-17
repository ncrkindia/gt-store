package com.gtstore.userservice.config;

import com.gtstore.userservice.entity.LoyaltyPointHistory;
import com.gtstore.userservice.entity.User;
import com.gtstore.userservice.repository.LoyaltyPointHistoryRepository;
import com.gtstore.userservice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class LoyaltyPointsUnlockScheduler {

    private static final Logger log = LoggerFactory.getLogger(LoyaltyPointsUnlockScheduler.class);

    @Autowired
    private LoyaltyPointHistoryRepository historyRepository;

    @Autowired
    private UserRepository userRepository;

    // Run every hour to check and unlock eligible points
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void unlockPendingLoyaltyPoints() {
        log.info("Checking for pending loyalty points to unlock...");
        List<LoyaltyPointHistory> pendingTxns = historyRepository.findByStatus("PENDING");
        LocalDateTime now = LocalDateTime.now();

        int unlockedCount = 0;
        for (LoyaltyPointHistory txn : pendingTxns) {
            if (txn.getAvailableAt() != null && txn.getAvailableAt().isBefore(now)) {
                Optional<User> userOpt = userRepository.findByEmail(txn.getEmail());
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    user.setLoyaltyPoints(user.getLoyaltyPoints().add(txn.getPoints()));
                    userRepository.save(user);

                    txn.setStatus("AVAILABLE");
                    historyRepository.save(txn);
                    unlockedCount++;
                }
            }
        }

        if (unlockedCount > 0) {
            log.info("Successfully unlocked {} pending loyalty points transactions.", unlockedCount);
        }
    }
}
