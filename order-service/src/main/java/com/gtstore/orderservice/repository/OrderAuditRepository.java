package com.gtstore.orderservice.repository;

import com.gtstore.orderservice.entity.OrderAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderAuditRepository extends JpaRepository<OrderAudit, Long> {
}
