package com.gtstore.orderservice.repository;

import com.gtstore.orderservice.entity.SystemSettingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SystemSettingHistoryRepository extends JpaRepository<SystemSettingHistory, Long> {
    List<SystemSettingHistory> findByKeyOrderByUpdatedAtDesc(String key);
    List<SystemSettingHistory> findAllByOrderByUpdatedAtDesc();
}
