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

@Component
public class PaymentEventListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventListener.class);
    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PaymentEventListener(OrderRepository orderRepository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.orderRepository = orderRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "payment.succeeded", groupId = "order-group")
    public void handlePaymentSucceeded(PaymentEvent event) {
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
            
            kafkaTemplate.send("order.paid", orderEvent.getOrderId(), orderEvent);
        }
    }
    
    @KafkaListener(topics = "payment.failed", groupId = "order-group")
    public void handlePaymentFailed(PaymentEvent event) {
        log.info("Received payment.failed event for orderId: {}", event.getOrderId());
        Optional<Order> orderOpt = orderRepository.findById(UUID.fromString(event.getOrderId()));
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus("CANCELLED");
            orderRepository.save(order);

            OrderEvent orderEvent = new OrderEvent();
            orderEvent.setOrderId(order.getId().toString());
            orderEvent.setStatus("CANCELLED");
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

            kafkaTemplate.send("order.cancelled", orderEvent.getOrderId(), orderEvent);
        }
    }
}
