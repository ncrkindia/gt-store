package com.gtstore.userservice.repository;

import com.gtstore.userservice.entity.LoyaltyPointHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoyaltyPointHistoryRepository extends JpaRepository<LoyaltyPointHistory, Long> {
    List<LoyaltyPointHistory> findByEmailOrderByCreatedAtDesc(String email);
    List<LoyaltyPointHistory> findByOrderId(String orderId);
    List<LoyaltyPointHistory> findByStatus(String status);
}
