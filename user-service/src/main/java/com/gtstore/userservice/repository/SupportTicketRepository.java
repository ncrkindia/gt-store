package com.gtstore.userservice.repository;

import com.gtstore.userservice.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    Optional<SupportTicket> findByTicketNumber(String ticketNumber);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
    List<SupportTicket> findByEmailOrderByCreatedAtDesc(String email);
}
