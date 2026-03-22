package com.gtstore.inventoryservice.listener;

import com.gtstore.inventoryservice.dto.OrderEvent;
import com.gtstore.inventoryservice.dto.StockReservationRequest;
import com.gtstore.inventoryservice.service.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class InventoryEventListener {

    private static final Logger log = LoggerFactory.getLogger(InventoryEventListener.class);
    private final InventoryService inventoryService;

    public InventoryEventListener(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @KafkaListener(topics = "order.cancelled", groupId = "inventory-group")
    public void handleOrderCancelled(OrderEvent event) {
        log.info("Received order.cancelled event for orderId: {}", event.getOrderId());
        if (event.getItems() != null) {
            event.getItems().forEach(item -> {
                StockReservationRequest req = new StockReservationRequest();
                req.setProductId(item.getProductId());
                req.setVariantId(item.getVariantId());
                req.setQuantity(item.getQuantity());
                inventoryService.releaseStock(req);
                log.info("Released stock for productId: {}, quantity: {}", item.getProductId(), item.getQuantity());
            });
        }
    }
}
