package com.gtstore.orderservice.repository;

import com.gtstore.orderservice.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Order> findAllByOrderByCreatedAtDesc();
    java.util.Optional<Order> findByOrderNumber(String orderNumber);
    List<Order> findByOrderNumberIsNull();
}
