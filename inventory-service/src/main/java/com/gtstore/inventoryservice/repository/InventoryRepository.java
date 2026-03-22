package com.gtstore.inventoryservice.repository;

import com.gtstore.inventoryservice.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findByProductIdAndVariantId(String productId, String variantId);
    Optional<Inventory> findByProductId(String productId);
}
