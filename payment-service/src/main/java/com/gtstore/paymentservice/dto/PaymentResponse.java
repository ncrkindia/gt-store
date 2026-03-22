package com.gtstore.paymentservice.dto;

import java.time.LocalDateTime;

public class PaymentResponse {
    private String orderId;
    private String status;
    private String transactionRef;
    private LocalDateTime timestamp;

    public PaymentResponse(String orderId, String status, String transactionRef) {
        this.orderId = orderId;
        this.status = status;
        this.transactionRef = transactionRef;
        this.timestamp = LocalDateTime.now();
    }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTransactionRef() { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
