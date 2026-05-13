package com.gtstore.userservice.repository;

import com.gtstore.userservice.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserId(UUID userId);

    @Modifying
    @Transactional
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.userId = :userId")
    void clearDefaultAddressForUser(UUID userId);
}
