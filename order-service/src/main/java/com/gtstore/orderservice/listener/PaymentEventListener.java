package com.gtstore.orderservice.listener;

import com.gtstore.orderservice.dto.OrderEvent;
import com.gtstore.orderservice.dto.OrderItemDto;
import com.gtstore.orderservice.dto.PaymentEvent;
import com.gtstore.orderservice.entity.Order;
import com.gtstore.orderservice.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

/**
 * Kafka Listener for payment-related events.
 * Listens for 'payment.succeeded' and 'payment.failed' to finalize or cancel orders.
 * 
 * - Succeeded: Marks order as PAID and publishes 'order.paid'.
 * - Failed: Marks order as CANCELLED and publishes 'order.cancelled' (to release stock).
 */
@Component
public class PaymentEventListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventListener.class);
    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PaymentEventListener(OrderRepository orderRepository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.orderRepository = orderRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    @KafkaListener(topics = "payment.succeeded", groupId = "order-group")
    public void handlePaymentSucceeded(String eventJson) {
        try {
            PaymentEvent event = objectMapper.readValue(eventJson, PaymentEvent.class);
            log.info("Received payment.succeeded event for orderId: {}", event.getOrderId());
        Optional<Order> orderOpt = orderRepository.findById(UUID.fromString(event.getOrderId()));
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus("PAID");
            orderRepository.save(order);

            OrderEvent orderEvent = new OrderEvent();
            orderEvent.setOrderId(order.getId().toString());
            orderEvent.setStatus("PAID");
            orderEvent.setEmail(order.getUserId());
            
            // Step 1: Notify of Payment Success
            kafkaTemplate.send("order.paid", orderEvent.getOrderId(), orderEvent);

            // Step 2: Automatically move to fulfillment
            order.setStatus("AWAITING_FULFILLMENT");
            orderRepository.save(order);
            orderEvent.setStatus("AWAITING_FULFILLMENT");
            kafkaTemplate.send("order.processing", orderEvent.getOrderId(), orderEvent);
            
            log.info("Order {} moved to AWAITING_FULFILLMENT after successful payment", event.getOrderId());
        }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse payment.succeeded event", e);
        }
    }
    
    @KafkaListener(topics = "payment.failed", groupId = "order-group")
    public void handlePaymentFailed(String eventJson) {
        try {
            PaymentEvent event = objectMapper.readValue(eventJson, PaymentEvent.class);
            log.info("Received payment.failed event for orderId: {}", event.getOrderId());
        Optional<Order> orderOpt = orderRepository.findById(UUID.fromString(event.getOrderId()));
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus("PAYMENT_FAILED");
            orderRepository.save(order);

            OrderEvent orderEvent = new OrderEvent();
            orderEvent.setOrderId(order.getId().toString());
            orderEvent.setStatus("PAYMENT_FAILED");
            orderEvent.setEmail(order.getUserId());
            
            if (order.getItems() != null) {
                orderEvent.setItems(order.getItems().stream().map(i -> {
                    OrderItemDto dto = new OrderItemDto();
                    dto.setProductId(i.getProductId());
                    dto.setVariantId(i.getVariantId());
                    dto.setQuantity(i.getQuantity());
                    return dto;
                }).collect(Collectors.toList()));
            }

            // Emit order.failed so other services can react (stock release, etc)
            kafkaTemplate.send("order.failed", orderEvent.getOrderId(), orderEvent);
            log.info("Order {} marked as PAYMENT_FAILED", order.getId());
        }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse payment.failed event", e);
        }
    }
}
