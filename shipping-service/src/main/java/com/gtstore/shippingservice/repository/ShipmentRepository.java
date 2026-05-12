package com.gtstore.shippingservice.repository;

import com.gtstore.shippingservice.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByOrderId(String orderId);
    List<Shipment> findAllByOrderByCreatedAtDesc();
}
