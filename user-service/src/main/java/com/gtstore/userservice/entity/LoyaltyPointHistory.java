package com.gtstore.userservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loyalty_point_history")
public class LoyaltyPointHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "order_id")
    private String orderId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal points;

    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // EARNED, REDEEMED

    @Column(nullable = false)
    private String status; // PENDING, AVAILABLE, CANCELLED

    @Column(name = "available_at")
    private LocalDateTime availableAt;

    @Column(nullable = false)
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public BigDecimal getPoints() { return points; }
    public void setPoints(BigDecimal points) { this.points = points; }
    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getAvailableAt() { return availableAt; }
    public void setAvailableAt(LocalDateTime availableAt) { this.availableAt = availableAt; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
