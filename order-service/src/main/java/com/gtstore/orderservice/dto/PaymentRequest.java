package com.gtstore.orderservice.dto;
import java.math.BigDecimal;

public class PaymentRequest {
    private String orderId;
    private BigDecimal amount;
    private String gateway;

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getGateway() { return gateway; }
    public void setGateway(String gateway) { this.gateway = gateway; }
}
