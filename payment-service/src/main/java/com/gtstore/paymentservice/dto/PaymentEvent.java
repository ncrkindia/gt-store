package com.gtstore.paymentservice.dto;

public class PaymentEvent {
    private String orderId;
    private String paymentStatus;
    private String transactionRef;

    public PaymentEvent() {}

    public PaymentEvent(String orderId, String paymentStatus, String transactionRef) {
        this.orderId = orderId;
        this.paymentStatus = paymentStatus;
        this.transactionRef = transactionRef;
    }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getTransactionRef() { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }
}
