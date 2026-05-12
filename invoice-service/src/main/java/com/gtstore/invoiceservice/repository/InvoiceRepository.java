package com.gtstore.invoiceservice.repository;

import com.gtstore.invoiceservice.entity.InvoiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<InvoiceRecord, Long> {
    Optional<InvoiceRecord> findByOrderId(String orderId);
}
