package com.gtstore.userservice.repository;

import com.gtstore.userservice.entity.SupportAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupportAuditRepository extends JpaRepository<SupportAudit, Long> {
    List<SupportAudit> findByTicketIdOrderByCreatedAtDesc(Long ticketId);
}
