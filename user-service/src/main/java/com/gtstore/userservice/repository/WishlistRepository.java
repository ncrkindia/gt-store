package com.gtstore.userservice.repository;

import com.gtstore.userservice.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WishlistRepository extends JpaRepository<WishlistItem, UUID> {
    List<WishlistItem> findByUserId(UUID userId);
    Optional<WishlistItem> findByUserIdAndProductId(UUID userId, String productId);
    
    @Transactional
    void deleteByUserIdAndProductId(UUID userId, String productId);
}
