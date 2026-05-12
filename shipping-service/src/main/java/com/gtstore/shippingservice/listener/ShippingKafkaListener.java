package com.gtstore.shippingservice.listener;

import com.gtstore.shippingservice.dto.OrderEvent;
import com.gtstore.shippingservice.entity.Shipment;
import com.gtstore.shippingservice.repository.ShipmentRepository;
import com.gtstore.shippingservice.service.ShiprocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ShippingKafkaListener {

    private static final Logger log = LoggerFactory.getLogger(ShippingKafkaListener.class);

    @Autowired
    private ShiprocketService shiprocketService;

    @Autowired
    private ShipmentRepository shipmentRepository;
    
    @Autowired
    private ObjectMapper objectMapper;

    @KafkaListener(topics = "order.ready_to_be_shipped", groupId = "shipping-group")
    public void handleOrderReadyForShipping(String rawMessage) {
        log.info("Received raw stream event for dispatch.");
        
        OrderEvent order;
        try {
            order = objectMapper.readValue(rawMessage, OrderEvent.class);
        } catch (Exception e) {
            log.error("Failed to deserialize incoming order event payload: {}", rawMessage, e);
            return;
        }

        log.info("Mapped notification: Order {} is ready for dispatch. Attempting logic connection.", order.getOrderId());

        // Verify idempotency
        if (shipmentRepository.findByOrderId(order.getOrderId()).isPresent()) {
            log.warn("Shipment record already initialized for order {}. Suppressing duplicate sync.", order.getOrderId());
            return;
        }

        try {
            // 1. Dispatch to external Logistics
            Map<String, Object> result = shiprocketService.createShipment(order);

            if (result != null) {
                // 2. Record results domestically
                Shipment shipment = new Shipment();
                shipment.setOrderId(order.getOrderId());
                shipment.setStatus("PENDING_PICKUP");

                // Extraction logic robust against variance in vendor responses
                Object extOrderId = result.get("order_id");
                Object extShipmentId = result.get("shipment_id");
                Object awbCode = result.get("awb_code");

                shipment.setShiprocketOrderId(extOrderId != null ? extOrderId.toString() : null);
                shipment.setShiprocketShipmentId(extShipmentId != null ? extShipmentId.toString() : null);
                shipment.setAwbCode(awbCode != null ? awbCode.toString() : "AWAITING_GENERATION");

                shipmentRepository.save(shipment);
                log.info("Successfully stored shipment link for order {} -> Shiprocket {}", order.getOrderId(), shipment.getShiprocketOrderId());
            } else {
                log.error("Failed to initiate third-party fulfillment flow for order {}", order.getOrderId());
            }

        } catch (Exception e) {
            log.error("Critical runtime failure during shipping execution for order {}", order.getOrderId(), e);
        }
    }
}
