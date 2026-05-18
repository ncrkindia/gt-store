package com.gtstore.productservice.document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Embedded document inside Product representing a price update event.
 */
public class PriceHistoryRecord {

    private BigDecimal oldPrice;
    private BigDecimal newPrice;
    private BigDecimal oldSalePrice;
    private BigDecimal newSalePrice;
    private String updatedBy;
    private LocalDateTime updatedAt;

    public PriceHistoryRecord() {
    }

    public PriceHistoryRecord(BigDecimal oldPrice, BigDecimal newPrice, BigDecimal oldSalePrice, BigDecimal newSalePrice, String updatedBy) {
        this.oldPrice = oldPrice;
        this.newPrice = newPrice;
        this.oldSalePrice = oldSalePrice;
        this.newSalePrice = newSalePrice;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }

    public BigDecimal getOldPrice() {
        return oldPrice;
    }

    public void setOldPrice(BigDecimal oldPrice) {
        this.oldPrice = oldPrice;
    }

    public BigDecimal getNewPrice() {
        return newPrice;
    }

    public void setNewPrice(BigDecimal newPrice) {
        this.newPrice = newPrice;
    }

    public BigDecimal getOldSalePrice() {
        return oldSalePrice;
    }

    public void setOldSalePrice(BigDecimal oldSalePrice) {
        this.oldSalePrice = oldSalePrice;
    }

    public BigDecimal getNewSalePrice() {
        return newSalePrice;
    }

    public void setNewSalePrice(BigDecimal newSalePrice) {
        this.newSalePrice = newSalePrice;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
