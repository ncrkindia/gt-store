package com.gtstore.invoiceservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
public class InvoiceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long invoiceNo;

    @Column(unique = true, nullable = false)
    private String orderId;

    private LocalDateTime generatedAt = LocalDateTime.now();

    public InvoiceRecord() {}
    public InvoiceRecord(String orderId) { this.orderId = orderId; }

    public Long getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(Long invoiceNo) { this.invoiceNo = invoiceNo; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
}
